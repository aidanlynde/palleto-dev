/**
 * CaptureScreen — drop-in replacement. Props match original.
 */
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { StyleSheet, View } from "react-native";

import { theme } from "../theme";
import {
  Body,
  Button,
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

      <ScrollScreen contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Meta style={styles.kicker}>NEW SCAN</Meta>
          <Display size={48} style={styles.display}>
            What caught
          </Display>
          <DisplayItalic size={48} style={styles.displayItalic}>
            your eye?
          </DisplayItalic>

          <Body style={styles.body}>
            Snap it now or pull from your library. Palleto will read it for color, form, and type direction through the lens of your current project.
          </Body>
        </View>

        <View style={styles.captureSurface}>
          <View style={styles.captureFrame}>
            <View style={styles.cornerTopLeft} />
            <View style={styles.cornerTopRight} />
            <View style={styles.cornerBottomLeft} />
            <View style={styles.cornerBottomRight} />

            <View style={styles.captureMark}>
              <Icon name="camera" size={30} color="rgba(28,26,23,0.38)" />
            </View>
          </View>

          <View style={styles.surfaceFooter}>
            <Meta color="rgba(28,26,23,0.52)">CAMERA OR LIBRARY</Meta>
            <Meta color="rgba(28,26,23,0.38)">READY</Meta>
          </View>
        </View>

        <View style={styles.actions}>
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

const cornerSize = 34;

const styles = StyleSheet.create({
  content: {
    paddingTop: 118,
    paddingBottom: 160
  },
  hero: {
    marginBottom: 24
  },
  kicker: {
    marginBottom: 8
  },
  display: {
    lineHeight: 49
  },
  displayItalic: {
    lineHeight: 49
  },
  body: {
    marginTop: 16,
    maxWidth: 330,
    fontSize: 15.5,
    lineHeight: 22
  },
  captureSurface: {
    minHeight: 304,
    borderRadius: theme.radius.xl,
    backgroundColor: "#D8D2C2",
    overflow: "hidden",
    padding: 18,
    justifyContent: "space-between",
    ...theme.shadow.lifted
  },
  captureFrame: {
    flex: 1,
    minHeight: 224,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: "rgba(28,26,23,0.12)",
    alignItems: "center",
    justifyContent: "center"
  },
  captureMark: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(250,247,240,0.68)",
    borderWidth: 1,
    borderColor: "rgba(28,26,23,0.08)"
  },
  cornerTopLeft: {
    position: "absolute",
    top: 18,
    left: 18,
    width: cornerSize,
    height: cornerSize,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: "rgba(28,26,23,0.26)"
  },
  cornerTopRight: {
    position: "absolute",
    top: 18,
    right: 18,
    width: cornerSize,
    height: cornerSize,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(28,26,23,0.26)"
  },
  cornerBottomLeft: {
    position: "absolute",
    bottom: 18,
    left: 18,
    width: cornerSize,
    height: cornerSize,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: "rgba(28,26,23,0.26)"
  },
  cornerBottomRight: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: cornerSize,
    height: cornerSize,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(28,26,23,0.26)"
  },
  surfaceFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18
  }
});
