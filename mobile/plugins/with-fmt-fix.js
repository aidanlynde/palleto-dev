const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

// Fixes "call to consteval function ... is not a constant expression" errors
// caused by older {fmt} versions being compiled with Xcode 16+ clang.
module.exports = function withFmtFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      let contents = fs.readFileSync(podfilePath, "utf8");

      const hook = `
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
        contents += hook;
        fs.writeFileSync(podfilePath, contents);
      }

      return config;
    },
  ]);
};
