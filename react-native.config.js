module.exports = {
  dependency: {
    platforms: {
      android: {
        packageImportPath: 'import com.applink.AppLinkPackage;',
        packageInstance: 'new AppLinkPackage()',
      },
      ios: null,
    },
  },
};
