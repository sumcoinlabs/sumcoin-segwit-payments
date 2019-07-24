// Source: https://github.com/cryptocoinjs/coininfo
// Note: Using bitcoin legacy bip32 constants for backwards compatability.
// We do this so that everything can work with xpub/xprv prefixed keys
module.exports = {
  mainnet: {
    messagePrefix: '\u0019Sumcoin Signed Message:\n',
    bip32: {
      public: 0x0488b41c, //complete
      private: 0x0488abe6 //complete
    },
    pubKeyHash: 0x30, //todo
    scriptHash: 0x32, //todo
    wif: 0xb0 //todo
  },
  testnet: {
    messagePrefix: '\u0019Sumcoin Signed Message:\n',
    bip32: {
      public: 0x0488b41c, //complete
      private: 0x0488abe6 //complete
    },
    pubKeyHash: 0x6f, //todo
    scriptHash: 0x3a, //todo
    wif: 0xef //todo
  }
}
