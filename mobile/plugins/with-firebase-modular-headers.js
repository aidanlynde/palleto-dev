const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

module.exports = function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfilePath, "utf8");

      const firebasePods = [
        "FirebaseCore",
        "FirebaseCoreInternal",
        "FirebaseInstallations",
        "GoogleUtilities",
      ]
        .map((pod) => `  pod '${pod}', :modular_headers => true`)
        .join("\n");

      if (!contents.includes("pod 'FirebaseCore', :modular_headers => true")) {
        contents = contents.replace(
          "target 'Palleto' do",
          `target 'Palleto' do\n${firebasePods}`
        );
        fs.writeFileSync(podfilePath, contents);
      }

      return config;
    },
  ]);
};
