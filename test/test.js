'use strict'

/* eslint-disable no-console, no-process-env */
/* eslint-env mocha */
/* eslint-disable no-unused-expressions */

const chai = require('chai')
const expect = chai.expect
chai.config.includeStack = true

let xprv = 'xprv9s21ZrQH143K3z2wCDRa3rHg9CHKedM1GvbJzGeZB14tsFdiDtpY6T96c1wWr9rwWhU5C8zcEWFbBVa4T3A8bhGSESDG8Kx1SSPfM2rrjxk'
let xpub44Btc = 'xpub6CpXMNySRnvK3cwAuEoQULXwaKdX7RRwVwRP4vXEdGDja7XBPxUAozsf7cm8bq97kkUxbR3tBDfRsUF48dhrXeZMAaNKk3VotNep6A4hrHj'
let privateKey = ''
let pubAddress = ''

// If you do this for real, you deserve what is coming to you.
let entropy = 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'

let SegwitDepositUtils = require('../index')({
  insightUrl: 'https://insight.litecore.io/api/',
  network: 'mainnet'
})
describe('Mainnet SegwitDepositUtils', function () {
  it('get an xpub from an xprv', function (done) {
    let generateXpub = SegwitDepositUtils.getXpubFromXprv(xprv)
    expect(generateXpub).to.deep.equal(xpub44Btc)
    done()
  })
  it('getDepositAddress for 0/1', function (done) {
    pubAddress = SegwitDepositUtils.bip44(xpub44Btc, 1)
    // console.log(pubAddress)
    expect(pubAddress).to.equal('M9iTc8NWxc6sgL5aYePMASLmAECy1q3aLo')
    done()
  })
  it('getPrivateKey for 0/1', function (done) {
    privateKey = SegwitDepositUtils.getPrivateKey(xprv, 1)
    expect(privateKey).to.equal('T5umfQzcJZpcDNEWeo2t5cNjw55DUWhyuRyuMykSjuWdB4oeLjFa')
    done()
  })
  it('privateToPublic for 0/1', function (done) {
    let pubKey = SegwitDepositUtils.privateToPublic(privateKey)
    expect(pubKey).to.equal(pubAddress)
    done()
  })
  it('getBalance of an address', function (done) {
    SegwitDepositUtils.getBalance('MMe8Vqxy8GqptPStHphqMDDr3JGAFaiCdm', function (err, balance) {
      if (err) console.log(err)
      expect(balance).to.deep.equal({
        balance: 0.00025,
        unconfirmedBalance: 0
      })
      done(err)
    })
  })
  it('generate a new set of pub and priv keys', function (done) {
    let keys = SegwitDepositUtils.generateNewKeys(entropy)
    expect(keys.xprv).to.equal('xprv9s21ZrQH143K3SPAc8jgfzFS4cFvbZBFCyDauH2pbBWuG2Vs1wvNAu6h6F3jsdakvPMbSdzNT6ESxnykGiQXgst5jkD21d2J5FTEiuLrxzn')
    expect(keys.xpub).to.equal('xpub6CS5X7HkuWZ9zouf9qqoSUMeMSmuouv9NVqu9i8wXFy1T51LJQREUFAwRi6bBFWj2DJ2h9j2mcnXXhXayVWXa4fDtntyEEjES4U4DgWLsge')
    let generatedPubAddress = SegwitDepositUtils.bip44(keys.xpub, 66)
    let generatedWIF = SegwitDepositUtils.getPrivateKey(keys.xprv, 66)
    expect(SegwitDepositUtils.privateToPublic(generatedWIF)).to.equal(generatedPubAddress)
    done()
  })

  // This test takes a long time. It really just makes sure we don't have padding
  // issues in a brute force way.
  let regress = false
  if (regress) {
    it('generate 1000 addresses and private keys, make sure they match', function (done) {
      let keys = SegwitDepositUtils.generateNewKeys(entropy)
      let paths = []
      for (let i = 4000; i < 5000; i++) {
        paths.push(i)
      }
      let tasks = []
      paths.forEach(function (path) {
        tasks.push(function (cb) {
          let pub = SegwitDepositUtils.bip44(keys.xpub, path)
          let prv = SegwitDepositUtils.getPrivateKey(keys.xprv, path)
          let pubFromPrv = SegwitDepositUtils.privateToPublic(prv)
          if (pub === pubFromPrv) {
            cb(null, {pub: pub, prv: prv})
          } else {
            cb(new Error('key mismatch', pub, prv, pubFromPrv))
          }
        })
      })
      let async = require('async')
      async.parallel(tasks, function (err, res) {
        expect(err).to.not.exist
        // console.log(res)
        done(err)
      })
    })
  }
  let getUTXOs = true
  if (getUTXOs) {
    it('Get UTXOs for a single address', function (done) {
      SegwitDepositUtils.getUTXOs(xpub44Btc, 1, function (err, utxos) {
        if (err) console.log(err)
        expect(utxos).to.deep.equal(utxosExpected)
        done()
      })
    })

    it('Generate a sweep transaction for a single address', function (done) {
      let to = 'MWHgdp2MREcVj1CkGq7jN8SN5fTZXEjjXe'
      let signedtx = SegwitDepositUtils.getSweepTransaction(xprv, 1, to, utxosExpected)
      expect(signedtx).to.deep.equal(signedTxExpected)
      done()
    })
  }
  let broadcast = true
  if (broadcast) {
    it('Broadcast a sweep transaction for a single address', function (done) {
      SegwitDepositUtils.broadcastTransaction(signedTxExpected, function (err, txHash) {
        if (err) console.log(err)
        expect(txHash).to.deep.equal(txHashExpected)
        done()
      })
    })
  }
})

const utxosExpected = [
  {
    address: 'M9iTc8NWxc6sgL5aYePMASLmAECy1q3aLo',
    txid: '93437740113fb281446658c2402c7b667cedd71918e263fdaf9f1f6cc8943276',
    vout: 0,
    scriptPubKey: 'a91413ea2ddd193facd29d00ca8a1daec7862ed4484a87',
    amount: 0.00035,
    satoshis: 35000
  },
  {
    address: 'M9iTc8NWxc6sgL5aYePMASLmAECy1q3aLo',
    txid: '7522b63f6708f32823e3ccb0840f687f41cb373f046cb4e10f993032e9d8fa52',
    vout: 0,
    scriptPubKey: 'a91413ea2ddd193facd29d00ca8a1daec7862ed4484a87',
    amount: 0.0003,
    satoshis: 30000
  },
  {
    address: 'M9iTc8NWxc6sgL5aYePMASLmAECy1q3aLo',
    txid: 'dcf89db33bb8daa9679d6c68f67bd98c1350fb09118316c33541eba179f763a9',
    vout: 0,
    scriptPubKey: 'a91413ea2ddd193facd29d00ca8a1daec7862ed4484a87',
    amount: 0.00025,
    satoshis: 25000
  },
  {
    address: 'M9iTc8NWxc6sgL5aYePMASLmAECy1q3aLo',
    txid: '114618c81ea6f2c1c71389427004fc193ac8955666c32237234b1a10662da125',
    vout: 0,
    scriptPubKey: 'a91413ea2ddd193facd29d00ca8a1daec7862ed4484a87',
    amount: 0.0001,
    satoshis: 10000
  }
]

const signedTxExpected = {
  txid: '4e5164621d64e0790d0a99babf900c1696bac0fc48feb96593635d9c2173fcde',
  signedTx: '01000000000104763294c86c1f9faffd63e21819d7ed7c667b2c40c258664481b23f114077439300000000171600149d6967773e13d492448d1a1ed4c5ac975ccddba0ffffffff52fad8e93230990fe1b46c043f37cb417f680f84b0cce32328f308673fb6227500000000171600149d6967773e13d492448d1a1ed4c5ac975ccddba0ffffffffa963f779a1eb4135c316831109fb50138cd97bf6686c9d67a9dab83bb39df8dc00000000171600149d6967773e13d492448d1a1ed4c5ac975ccddba0ffffffff25a12d66101a4b233722c3665695c83a19fc0470428913c7c1f2a61ec818461100000000171600149d6967773e13d492448d1a1ed4c5ac975ccddba0ffffffff01827701000000000017a914f5954c331d28d2529002e5afed2803f4e86400b8870248304502210099c202088632e780aad97468b8ea58fadb995478b896ecd4319f0d6b07159208022022f3f37d070a3bc1f9f6b807870d96f11d422b6deaa53edecbde81a548fd0a83012102478eba81bb3bb644c0a9bf6f28b77cf443a4195dc58fc8e4a339e6c958df4f0f0247304402207df92f6ee45ef2d930191e1a5d7bdcd4341064dc8329f53c0394dbc6802f397d0220248f0f1c5b93c14307c5f1f31cca7a86fb92ec850a2b0814db4aad4d912d4e6e012102478eba81bb3bb644c0a9bf6f28b77cf443a4195dc58fc8e4a339e6c958df4f0f02473044022000e38e81361bd60d1e7d701aefafee3e26ce53b7b308decf33d8888d376b3ff3022031d88ec1f400b851f1236b108a9cf23d088a83993e37cc9e97b76e0869656a51012102478eba81bb3bb644c0a9bf6f28b77cf443a4195dc58fc8e4a339e6c958df4f0f02473044022048411863e4d594442b72442662cf26db0593a5e1d0a98690008ea0c2e28d101d02205666cd59604e2ff10cb0d80a777d2bf39f6479d745ec9f28137e491df3511b06012102478eba81bb3bb644c0a9bf6f28b77cf443a4195dc58fc8e4a339e6c958df4f0f00000000'
}
const txHashExpected = {
  broadcasted: true,
  txid: signedTxExpected.txid,
  signedTx: signedTxExpected.signedTx
}
