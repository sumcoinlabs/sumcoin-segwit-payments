// Source: https://github.com/cryptocoinjs/coininfo
// Note: Using bitcoin legacy bip32 constants for backwards compatability.
// We do this so that everything can work with xpub/xprv prefixed keys
module.exports = {
  mainnet: {
    messagePrefix: '\u0019Sumcoin Signed Message:\n',
    bip32: {
      public: 0x0488b41c, 
      private: 0x0488abe6 
    },
    pubKeyHash: 0x3f, 
    scriptHash: 0xc8, 
    wif: 0xbf 
  },
  testnet: {
    messagePrefix: '\u0019Sumcoin Signed Message:\n',
    bip32: {
      public: 0x0488b41c, 
      private: 0x0488abe6 
    },
    pubKeyHash: 0x3f, 
    scriptHash: 0xc8, 
    wif: 0xbf 
  }
}
