// Source: https://github.com/cryptocoinjs/coininfo
// Note: Using bitcoin legacy bip32 constants for backwards compatability.
// We do this so that everything can work with xpub/xprv prefixed keys
module.exports = {
  mainnet: {
    messagePrefix: '\u0019Sumcoin Signed Message:\n',
    bip32: {
      public: 0x0488b41c,
      private: 0x0488abe6 //complete
    },
    pubKeyHash: 0x30, //todo's < and below
    scriptHash: 0x32,
    wif: 0xb0
  },
  testnet: {
    messagePrefix: '\u0019Sumcoin Signed Message:\n',
    bip32: {
      public: 0x0488b41c,
      private: 0x0488abe6
    },
    pubKeyHash: 0x6f,
    scriptHash: 0x3a,
    wif: 0xef
  }
}
