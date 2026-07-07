const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

module.exports = function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfilePath, "utf8");

      // ── Firebase modular headers ──
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
      }

      // ── fmt consteval fix for Xcode 16+ ──
      // Older {fmt} versions bundled in native pods use FMT_COMPILE_STRING which
      // triggers a consteval error with clang 17+. Setting -DFMT_USE_CONSTEVAL=0
      // disables consteval usage across all pod targets.
      const fmtHook = `
post_install do |installer_fmt_fix|
  installer_fmt_fix.pods_project.targets.each do |target|
    target.build_configurations.each do |cfg|
      existing = cfg.build_settings['OTHER_CPLUSPLUSFLAGS'] || '$(inherited)'
      unless existing.include?('FMT_USE_CONSTEVAL')
        cfg.build_settings['OTHER_CPLUSPLUSFLAGS'] = existing + ' -DFMT_USE_CONSTEVAL=0'
      end
    end
  end
end
`;

      if (!contents.includes("FMT_USE_CONSTEVAL")) {
        contents += fmtHook;
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
