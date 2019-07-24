const bitcoin = require('bitcoinjs-lib')
const request = require('request')
const networks = require('./networks')
const MIN_RELAY_FEE = 1000
const DEFAULT_SAT_PER_BYTE = 10
const DERIVE_PATH = "m/49'/2'/0'"

function SegwitDepositUtils (options) {
  if (!(this instanceof SegwitDepositUtils)) return new SegwitDepositUtils(options)
  let self = this
  self.options = Object.assign({}, options || {})
  if (!self.options.insightUrl) {
    self.options.insightUrl = 'https://insight.litecore.io/api/'
    console.log('WARN: Using default bitcoin block explorer. It is highly suggested you set one yourself!', self.options.insightUrl)
  }

  if (!self.options.feePerKb) {
    self.options.feePerByte = DEFAULT_SAT_PER_BYTE
  }
  if (!self.options.network || (self.options.network === 'mainnet')) {
    self.options.network = networks.mainnet
    if (!self.options.backupBroadcastUrl) {
      self.options.backupBroadcastUrl = 'https://sum1.trezor.io/api/sendtx/'
    }
  } else if (self.options.network === 'testnet') {
    self.options.network = networks.testnet
    if (!self.options.backupBroadcastUrl) {
      self.options.backupBroadcastUrl = 'https://sum1.trezor.io/api/sendtx/'
    }
  } else {
    throw new Error('Invalid network provided ' + self.options.network)
  }
  // if (!self.options.password) throw new Error('SegwitDepositUtils: password required')
  return self
}

SegwitDepositUtils.prototype.bip44 = function (xpub, path) {
  let self = this
  let node = bitcoin.HDNode.fromBase58(xpub, self.options.network)
  let nodeDerivation = node.derive(0).derive(path)
  let redeemScript = bitcoin.script.witnessPubKeyHash.output.encode(bitcoin.crypto.hash160(nodeDerivation.getPublicKeyBuffer()))
  let scriptPubKey = bitcoin.script.scriptHash.output.encode(bitcoin.crypto.hash160(redeemScript))
  return bitcoin.address.fromOutputScript(scriptPubKey, self.options.network)
}

SegwitDepositUtils.prototype.getPrivateKey = function (xprv, path) {
  let self = this
  if (!xprv) throw new Error('Xprv is null. Bad things will happen to you.')
  // create the hd wallet
  const node = bitcoin.HDNode.fromBase58(xprv, self.options.network)
  let child = node.derivePath(DERIVE_PATH)
  let nodeDerivation = child.derive(0).derive(path)
  return nodeDerivation.keyPair.toWIF()
}

SegwitDepositUtils.prototype.privateToPublic = function (privateKey) {
  let self = this
  var keyPair = bitcoin.ECPair.fromWIF(privateKey, self.options.network)
  let redeemScript = bitcoin.script.witnessPubKeyHash.output.encode(bitcoin.crypto.hash160(keyPair.getPublicKeyBuffer()))
  let scriptPubKey = bitcoin.script.scriptHash.output.encode(bitcoin.crypto.hash160(redeemScript))
  return bitcoin.address.fromOutputScript(scriptPubKey, self.options.network)
}

SegwitDepositUtils.prototype.generateNewKeys = function (entropy) {
  let self = this
  var root = bitcoin.HDNode.fromSeedHex(entropy, self.options.network)
  return {
    xprv: root.toBase58(),
    xpub: self.getXpubFromXprv(root.toBase58())
  }
}

SegwitDepositUtils.prototype.getXpubFromXprv = function (xprv) {
  let self = this
  let node = bitcoin.HDNode.fromBase58(xprv, self.options.network)
  let child = node.derivePath(DERIVE_PATH)
  // let derivedPubKey = key.derive("m/44'/60'/0'/0").hdPublicKey
  return child.neutered().toBase58()
}

SegwitDepositUtils.prototype.getBalance = function (address, done) {
  let self = this
  let url = self.options.insightUrl + 'addr/' + address
  request.get({json: true, url: url}, function (err, response, body) {
    if (!err && response.statusCode !== 200) {
      return done(new Error('Unable to get balance from ' + url))
    } else {
      done(null, {balance: body.balance, unconfirmedBalance: body.unconfirmedBalance})
    }
  })
}

SegwitDepositUtils.prototype.getUTXOs = function (xpub, path, done) {
  let self = this
  let address = self.bip44(xpub, path)
  // console.log('sweeping ', address)
  let url = self.options.insightUrl + 'addr/' + address + '/utxo'
  request.get({json: true, url: url}, function (err, response, body) {
    if (!err && response.statusCode !== 200) {
      return done(new Error('Unable to get UTXOs from ' + url + ' - status ' + response.statusCode))
    } else if (body.length === 0) {
      return done(new Error('Unable to get UTXOs from ' + url + ' - empty response'))
    } else {
      let cleanUTXOs = []
      body.forEach(function (utxo) {
        delete utxo['confirmations']
        delete utxo['height']
        delete utxo['ts']
        cleanUTXOs.push(utxo)
      })
      if (self.options.network === networks.testnet) {
        console.log('TESTNET ENABLED: Clipping UTXO length to 2 for test purposes')
        cleanUTXOs = cleanUTXOs.slice(0, 2)
      }
      done(null, cleanUTXOs)
    }
  })
}
SegwitDepositUtils.prototype.getSweepTransaction = function (xprv, path, to, utxo, feePerByte) {
  let self = this
  const txb = new bitcoin.TransactionBuilder(self.options.network)
  let totalBalance = 0
  if (utxo.length === 0) {
    return new Error('no UTXOs')
  }
  utxo.forEach(function (spendable) {
    totalBalance += spendable.satoshis
    txb.addInput(spendable.txid, spendable.vout) // alice1 unspent
  })
  if (!feePerByte) feePerByte = self.options.feePerByte
  let txfee = estimateTxFee(feePerByte, utxo.length, 1, true)
  if (txfee < MIN_RELAY_FEE) txfee = MIN_RELAY_FEE
  if ((totalBalance - txfee) < txfee) return new Error('Balance too small to sweep!' + totalBalance + ' ' + txfee)
  txb.addOutput(to, totalBalance - txfee)
  let keyPair = bitcoin.HDNode.fromBase58(xprv, self.options.network).derivePath(DERIVE_PATH).derive(0).derive(path).keyPair
  let redeemScript = bitcoin.script.witnessPubKeyHash.output.encode(bitcoin.crypto.hash160(keyPair.getPublicKeyBuffer()))
  for (let i = 0; i < utxo.length; i++) {
    txb.sign(i,
      keyPair,
      redeemScript,
      null, // Null for simple Segwit
      utxo[i].satoshis
    )
  }
  return { signedTx: txb.build().toHex(), txid: txb.build().getId() }
}

SegwitDepositUtils.prototype.broadcastTransaction = function (txObject, done, retryUrl, originalResponse) {
  let self = this
  let textBody = txObject.signedTx
  let url
  if (retryUrl) url = retryUrl
  else url = 'https://sum1.trezor.io/api/sendtx/'
  var options = {
    url: url,
    method: 'POST',
    body: textBody
  }
  request(options, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      txObject.broadcasted = true
      done(null, txObject)
    } else {
      if (url !== retryUrl) { // First broadcast attempt. Lets try again.
        self.broadcastTransaction(txObject, done, self.options.backupBroadcastUrl, body)
      } else {
        // Second attempt failed
        done(new Error('unable to broadcast. Some debug info: ' + body.toString() + ' ---- ' + originalResponse.toString()))
      }
    }
  })
}

SegwitDepositUtils.prototype.sweepTransaction = function (xpub, xprv, path, to, feePerByte, done) {
  let self = this
  self.getUTXOs(xpub, path, function (err, utxo) {
    if (err) return done(err)
    let signedTx = self.getSweepTransaction(xprv, path, to, utxo, feePerByte)
    self.broadcastTransaction(signedTx, done)
  })
}

/**
 * Estimate size of transaction a certain number of inputs and outputs.
 * This function is based off of ledger-wallet-webtool/src/TransactionUtils.js#estimateTransactionSize
 */
function estimateTxSize (inputsCount, outputsCount, handleSegwit) {
  var maxNoWitness,
    maxSize,
    maxWitness,
    minNoWitness,
    minSize,
    minWitness,
    varintLength
  if (inputsCount < 0xfd) {
    varintLength = 1
  } else if (inputsCount < 0xffff) {
    varintLength = 3
  } else {
    varintLength = 5
  }
  if (handleSegwit) {
    minNoWitness =
      varintLength + 4 + 2 + 59 * inputsCount + 1 + 31 * outputsCount + 4
    maxNoWitness =
      varintLength + 4 + 2 + 59 * inputsCount + 1 + 33 * outputsCount + 4
    minWitness =
      varintLength +
      4 +
      2 +
      59 * inputsCount +
      1 +
      31 * outputsCount +
      4 +
      106 * inputsCount
    maxWitness =
      varintLength +
      4 +
      2 +
      59 * inputsCount +
      1 +
      33 * outputsCount +
      4 +
      108 * inputsCount
    minSize = (minNoWitness * 3 + minWitness) / 4
    maxSize = (maxNoWitness * 3 + maxWitness) / 4
  } else {
    minSize = varintLength + 4 + 146 * inputsCount + 1 + 31 * outputsCount + 4
    maxSize = varintLength + 4 + 148 * inputsCount + 1 + 33 * outputsCount + 4
  }
  return {
    min: minSize,
    max: maxSize
  }
}

function estimateTxFee (satPerByte, inputsCount, outputsCount, handleSegwit) {
  const { min, max } = estimateTxSize(inputsCount, outputsCount, handleSegwit)
  const mean = Math.ceil((min + max) / 2)
  return mean * satPerByte
}

module.exports = SegwitDepositUtils
