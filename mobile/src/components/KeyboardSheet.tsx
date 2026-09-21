import { useMemo } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ThemeColors } from '@/src/theme/theme';
import { useTheme } from '@/src/hooks/ThemeProvider';

type KeyboardSheetProps = {
  visible: boolean;
  onRequestClose?: () => void;
  children: React.ReactNode;
  scroll?: boolean;
};

export function KeyboardSheet({
  visible,
  onRequestClose,
  children,
  scroll = false,
}: KeyboardSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const dismissKeyboard = () => Keyboard.dismiss();
  const dismissOutside = () => {
    Keyboard.dismiss();
    onRequestClose?.();
  };

  const sheet = (
    <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
      <View style={styles.sheet}>{children}</View>
    </TouchableWithoutFeedback>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismissOutside}>
      <KeyboardAvoidingView behavior="padding" style={styles.avoid} automaticOffset>
        <View style={styles.backdrop}>
          <Pressable
            style={styles.outside}
            onPress={dismissOutside}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          />
          {scroll ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              bounces={false}
              style={styles.sheetScrollView}
            >
              {sheet}
            </ScrollView>
          ) : (
            sheet
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    avoid: {
      flex: 1,
    },
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    outside: {
      ...StyleSheet.absoluteFill,
    },
    sheetScrollView: {
      maxHeight: '85%',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 36,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}
