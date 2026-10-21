import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '../theme';

interface Props {
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Rodapé fixo com a linha superior (CTA do cadastro). */
  stickyFooter?: boolean;
  gap?: number;
  scrollRef?: React.Ref<ScrollViewInstance>;
}

/** Esqueleto das telas de autenticação: cabeçalho, conteúdo rolável e rodapé. */
export function AuthScreen({ header, children, footer, stickyFooter, gap = 20, scrollRef }: Props) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 12) + 22;
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top }}>{header}</View>
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[styles.content, { gap }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, stickyFooter && styles.sticky, { paddingBottom: bottom }]}>{footer}</View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: space.gutter, paddingTop: 8, paddingBottom: space.xl },
  footer: { paddingHorizontal: space.gutter, paddingTop: 12 },
  sticky: { borderTopWidth: 1, borderTopColor: colors.surface },
});
