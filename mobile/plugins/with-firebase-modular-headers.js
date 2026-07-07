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

      // ── fmt consteval fix for Xcode 16+ clang ──
      // Older {fmt} versions bundled in React Native use FMT_COMPILE_STRING which
      // triggers a consteval error with clang 17+. We inject inside the EXISTING
      // post_install block (not as a second block — CocoaPods only keeps one
      // post_install callback, so a second call would silently drop react_native_post_install).
      //
      // The generated Podfile ends with:
      //     end          ← closes installer.target_installation_results.each
      //   end            ← closes post_install do |installer|
      // end              ← closes target 'Palleto' do
      // GCC_PREPROCESSOR_DEFINITIONS applies to ALL compilation types (C, C++, ObjC, ObjC++)
      // unlike OTHER_CPLUSPLUSFLAGS which only covers C++/ObjC++.
      // Note: GCC_PREPROCESSOR_DEFINITIONS uses NAME=VALUE syntax (no -D prefix).
      const fmtCode = [
        "",
        "    installer.pods_project.targets.each do |fmt_target|",
        "      fmt_target.build_configurations.each do |build_cfg|",
        "        defs = build_cfg.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || '$(inherited)'",
        "        unless defs.include?('FMT_USE_CONSTEVAL')",
        "          build_cfg.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs + ' FMT_USE_CONSTEVAL=0'",
        "        end",
        "        flags = build_cfg.build_settings['OTHER_CPLUSPLUSFLAGS'] || '$(inherited)'",
        "        unless flags.include?('FMT_USE_CONSTEVAL')",
        "          build_cfg.build_settings['OTHER_CPLUSPLUSFLAGS'] = flags + ' -DFMT_USE_CONSTEVAL=0'",
        "        end",
        "      end",
        "    end",
      ].join("\n");

      if (!contents.includes("FMT_USE_CONSTEVAL")) {
        // Replace the closing 4-2-0 indent sequence that ends the file.
        contents = contents.replace(
          "    end\n  end\nend\n",
          `    end\n${fmtCode}\n  end\nend\n`
        );
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
