/**
 * CaptureScreen — drop-in replacement. Props match original.
 */
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { View } from "react-native";

import { theme } from "../theme";
import {
  Body,
  Button,
  Chip,
  Display,
  DisplayItalic,
  Icon,
  Meta,
  Pill,
  ScrollScreen,
  TopBar
} from "../ui";

type CaptureScreenProps = {
  onOpenQuickAccess: () => void;
  onImageSelected: (input: {
    mimeType?: string | null;
    sourceType: "camera" | "library";
    uri: string;
  }) => void;
};

export function CaptureScreen({ onImageSelected, onOpenQuickAccess }: CaptureScreenProps) {
  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.92
    });
    if (!result.canceled && result.assets[0]) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onImageSelected({
        mimeType: result.assets[0].mimeType,
        sourceType: "camera",
        uri: result.assets[0].uri
      });
    }
  }

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.92
    });
    if (!result.canceled && result.assets[0]) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onImageSelected({
        mimeType: result.assets[0].mimeType,
        sourceType: "library",
        uri: result.assets[0].uri
      });
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.palette.bone }}>
      <TopBar
        right={<Pill icon="folder" onPress={onOpenQuickAccess} />}
      >
        <Meta>CAPTURE</Meta>
      </TopBar>

      <ScrollScreen>
        <Meta style={{ marginBottom: 6 }}>NEW SCAN</Meta>
        <Display size={44} style={{ lineHeight: 46 }}>
          What caught
        </Display>
        <DisplayItalic size={44} style={{ lineHeight: 46 }}>
          your eye?
        </DisplayItalic>

        <Body style={{ marginTop: 14, fontSize: 15.5, maxWidth: 320 }}>
          Snap it now or pull from your library. Palleto will read it for color, form, and type direction — through the lens of your current project.
        </Body>

        {/* Viewfinder placeholder */}
        <View
          style={{
            marginTop: 24,
            aspectRatio: 3 / 4,
            borderRadius: theme.radius.xl,
            backgroundColor: "#D8D2C2",
            overflow: "hidden",
            ...theme.shadow.lifted
          }}
        >
          <View
            style={{
              position: "absolute",
              top: 20,
              left: 20,
              right: 20,
              bottom: 20,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: "rgba(28,26,23,0.18)",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}
          >
            <Icon name="camera" size={28} color="rgba(28,26,23,0.35)" />
            <Meta color="rgba(28,26,23,0.45)">VIEWFINDER · POINT & HOLD STILL</Meta>
          </View>

          <View style={{ position: "absolute", left: 16, top: 16 }}>
            <Chip dot>Active project</Chip>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 24 }}>
          <Button icon="camera" full onPress={takePhoto}>
            Take photo
          </Button>
          <Button icon="image" variant="secondary" full onPress={choosePhoto}>
            Upload
          </Button>
        </View>
      </ScrollScreen>
    </View>
  );
}
