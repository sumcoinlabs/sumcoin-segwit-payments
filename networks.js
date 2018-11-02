// Source: https://github.com/cryptocoinjs/coininfo
// Note: Using bitcoin legacy bip32 constants for backwards compatability.
// We do this so that everything can work with xpub/xprv prefixed keys
module.exports = {
  mainnet: {
    messagePrefix: '\u0019Litecoin Signed Message:\n',
    bip32: {
      public: 0x0488b21e,
      private: 0x0488ade4
    },
    pubKeyHash: 0x30,
    scriptHash: 0x32,
    wif: 0xb0
  },
  testnet: {
    messagePrefix: '\u0019Litecoin Signed Message:\n',
    bip32: {
      public: 0x043587cf,
      private: 0x04358394
    },
    pubKeyHash: 0x6f,
    scriptHash: 0x3a,
    wif: 0xef
  }
}
