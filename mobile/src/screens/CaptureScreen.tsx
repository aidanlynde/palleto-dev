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
  Meta,
  ScrollScreen
} from "../ui";

type CaptureScreenProps = {
  onOpenQuickAccess: () => void;
  onImageSelected: (input: {
    mimeType?: string | null;
    sourceType: "camera" | "library";
    uri: string;
  }) => void;
};

export function CaptureScreen({ onImageSelected }: CaptureScreenProps) {
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

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: 72,
    paddingBottom: 96
  },
  hero: {
    marginBottom: 30
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
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 0
  }
});
