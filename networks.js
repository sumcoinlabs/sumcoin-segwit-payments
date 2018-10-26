// Source: https://github.com/cryptocoinjs/coininfo
module.exports = {
  mainnet: {
    messagePrefix: '\u0019Litecoin Signed Message:\n',
    bip32: {
      public: 0x019da462,
      private: 0x019d9cfe
    },
    pubKeyHash: 0x30,
    scriptHash: 0x32,
    wif: 0xb0
  },
  testnet: {
    messagePrefix: '\u0019Litecoin Signed Message:\n',
    bip32: {
      public: 0x0436f6e1,
      private: 0x0436ef7d
    },
    pubKeyHash: 0x6f,
    scriptHash: 0x3a,
    wif: 0xef
  }
}
