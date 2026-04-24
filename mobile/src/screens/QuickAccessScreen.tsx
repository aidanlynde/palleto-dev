import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

export function QuickAccessScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Quick access</Text>
        <Text style={styles.title}>Make capture one move away.</Text>
        <Text style={styles.body}>
          The fastest setup is a system control on your Lock Screen or in Control Center. A Home
          Screen widget is the secondary path. This keeps Palleto reachable when you spot
          something in the wild.
        </Text>
      </View>

      <InstructionCard
        eyebrow="Best path"
        title="Lock Screen or Control Center control"
        body="Use a single-purpose Palleto control that opens straight into capture. This is the cleanest route for in-the-moment scans."
        steps={[
          "When Palleto quick access is available, long-press your Lock Screen and tap Customize.",
          "Choose Lock Screen controls, then add the Palleto control.",
          "You can also add the same control in Control Center for swipe-down access."
        ]}
      />

      <InstructionCard
        eyebrow="Secondary path"
        title="Home Screen or Lock Screen widget"
        body="Widgets are useful when you want a visible Palleto entry point on the device, but they are less direct than a control."
        steps={[
          "Long-press the Home Screen and tap Edit.",
          "Tap Add Widget, then choose Palleto.",
          "Place the small widget near where you already keep your camera and utility apps."
        ]}
      />

      <InstructionCard
        eyebrow="Power users"
        title="Action button later"
        body="Once Palleto exposes a capture shortcut, the Action button becomes the fastest hardware route into scan."
        steps={[
          "Go to Settings, then Action Button on supported iPhone models.",
          "Choose the Palleto shortcut that opens capture.",
          "Use this only if you want one-press capture to replace another Action button behavior."
        ]}
      />

      <View style={styles.note}>
        <Text style={styles.noteTitle}>What we are building next</Text>
        <Text style={styles.noteBody}>
          The next native pass should ship a dedicated Palleto control first. That is the highest
          value shortcut surface for this product.
        </Text>
      </View>
    </ScrollView>
  );
}

function InstructionCard({
  body,
  eyebrow,
  steps,
  title
}: {
  body: string;
  eyebrow: string;
  steps: string[];
  title: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardEyebrow}>{eyebrow}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>

      <View style={styles.stepList}>
        {steps.map((step, index) => (
          <View key={step} style={styles.stepRow}>
            <View style={styles.stepIndex}>
              <Text style={styles.stepIndexText}>{String(index + 1).padStart(2, "0")}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg
  },
  hero: {
    gap: theme.spacing.sm
  },
  eyebrow: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40
  },
  body: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    lineHeight: 24
  },
  card: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  cardEyebrow: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28
  },
  cardBody: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21
  },
  stepList: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs
  },
  stepRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  stepIndex: {
    width: 34
  },
  stepIndexText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 21
  },
  stepText: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21
  },
  note: {
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1
  },
  noteTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "800"
  },
  noteBody: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21
  }
});
