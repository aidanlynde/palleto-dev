import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

type CaptureScreenProps = {
  onImageSelected: (input: {
    mimeType?: string | null;
    sourceType: "camera" | "library";
    uri: string;
  }) => void;
};

export function CaptureScreen({ onImageSelected }: CaptureScreenProps) {
  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      return;
    }

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

    if (!permission.granted) {
      return;
    }

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
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Capture</Text>
      <Text style={styles.title}>What caught your eye?</Text>
      <Text style={styles.body}>
        Take a photo in the moment or upload a saved reference. Palleto will turn it into a
        project-aware inspiration card.
      </Text>

      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={takePhoto}>
          <Text style={styles.primaryButtonText}>Take photo</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={choosePhoto}>
          <Text style={styles.secondaryButtonText}>Upload photo</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background
  },
  eyebrow: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 38,
    fontWeight: "800",
    lineHeight: 44
  },
  body: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 16,
    lineHeight: 24
  },
  actions: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: theme.radius.small
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: "800"
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "800"
  }
});
