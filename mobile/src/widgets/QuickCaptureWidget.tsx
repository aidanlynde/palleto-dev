import { HStack, Image, Spacer, Text, VStack, ZStack } from "@expo/ui/swift-ui";
import {
  background,
  font,
  foregroundStyle,
  frame,
  multilineTextAlignment,
  padding,
  widgetURL
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

type QuickCaptureWidgetProps = {
  projectLabel?: string;
  subtitle?: string;
};

const captureUrl = "palleto://capture";

function QuickCaptureWidgetView(
  props: QuickCaptureWidgetProps,
  environment: WidgetEnvironment
) {
  "widget";

  const projectLabel = props.projectLabel || "Capture";
  const subtitle = props.subtitle || "Open Palleto";
  const rootModifiers = [widgetURL(captureUrl)];

  if (environment.widgetFamily === "accessoryCircular") {
    return (
      <ZStack modifiers={rootModifiers}>
        <Image
          systemName="camera.fill"
          modifiers={[
            foregroundStyle("#FFFFFF"),
            frame({
              width: 22,
              height: 22
            })
          ]}
        />
      </ZStack>
    );
  }

  if (environment.widgetFamily === "accessoryInline") {
    return (
      <Text
        modifiers={[
          ...rootModifiers,
          font({ size: 14, weight: "semibold" }),
          foregroundStyle("#FFFFFF")
        ]}
      >
        Capture inspiration
      </Text>
    );
  }

  if (environment.widgetFamily === "accessoryRectangular") {
    return (
      <HStack modifiers={[...rootModifiers, padding({ all: 8 })]}>
        <VStack spacing={2}>
          <Text modifiers={[font({ size: 15, weight: "bold" }), foregroundStyle("#FFFFFF")]}>
            Capture now
          </Text>
          <Text modifiers={[font({ size: 12, weight: "medium" }), foregroundStyle("#A3A3A3")]}>
            {projectLabel}
          </Text>
        </VStack>
        <Spacer />
        <Image systemName="camera.fill" modifiers={[foregroundStyle("#FFFFFF")]} />
      </HStack>
    );
  }

  return (
    <VStack
      spacing={8}
      modifiers={[
        ...rootModifiers,
        background("#000000"),
        padding({ all: 12 }),
        frame({
          maxWidth: 999,
          maxHeight: 999,
          alignment: "topLeading"
        })
      ]}
    >
      <Image systemName="camera.fill" modifiers={[foregroundStyle("#FFFFFF")]} />
      <VStack spacing={4}>
        <Text modifiers={[font({ size: 16, weight: "bold" }), foregroundStyle("#FFFFFF")]}>
          Capture
        </Text>
        <Text
          modifiers={[
            font({ size: 12, weight: "medium" }),
            foregroundStyle("#A3A3A3"),
            multilineTextAlignment("leading")
          ]}
        >
          {subtitle}
        </Text>
      </VStack>
    </VStack>
  );
}

const QuickCaptureWidget = createWidget<QuickCaptureWidgetProps>(
  "QuickCaptureWidget",
  QuickCaptureWidgetView
);

export default QuickCaptureWidget;
