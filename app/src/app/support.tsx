import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { supportService } from '../services/api';
import { restoreAuthToken } from '../services/api/client';
import { jwtDecode } from 'jwt-decode';

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const MAX_SUBJECT_WORDS = 50;
  const MAX_MESSAGE_WORDS = 200;

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await restoreAuthToken();
      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          const tokenUser = decoded.user || decoded;
          setUserEmail(tokenUser.email || null);
          setUserName(tokenUser.fullName || tokenUser.name || null);
        } catch (err) {
          // ignore
        }
      }
    })();
  }, []);

  const countWords = (text: string) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const limitWords = (text: string, max: number) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length <= max) return text;
    return words.slice(0, max).join(' ');
  };

  const handleSubjectChange = (text: string) => {
    setSubject(limitWords(text, MAX_SUBJECT_WORDS));
  };

  const handleMessageChange = (text: string) => {
    setMessage(limitWords(text, MAX_MESSAGE_WORDS));
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Please enter your complaint');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        message: message.trim(),
        subject: subject.trim() || undefined,
        userEmail: userEmail ?? undefined,
        userName: userName ?? undefined,
      };
      const subjectWords = countWords(payload.subject || '');
      const messageWords = countWords(payload.message || '');

      if (subjectWords > MAX_SUBJECT_WORDS) {
        Alert.alert(`Subject cannot exceed ${MAX_SUBJECT_WORDS} words`);
        setIsSubmitting(false);
        return;
      }

      if (messageWords === 0) {
        Alert.alert('Please enter your complaint');
        setIsSubmitting(false);
        return;
      }

      if (messageWords > MAX_MESSAGE_WORDS) {
        Alert.alert(`Message cannot exceed ${MAX_MESSAGE_WORDS} words`);
        setIsSubmitting(false);
        return;
      }
      const resp: any = await supportService.submit(payload);
      if (!resp.success) {
        throw new Error(resp.error || 'Failed to submit');
      }

      Alert.alert('Thank you', 'Your complaint has been submitted.');
      setMessage('');
      setSubject('');
      router.back();
    } catch (err: any) {
      console.log('Support submit error', err);
      Alert.alert('Submission failed', err?.message || 'Please try again later');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          hitSlop={12}
          style={({ pressed }) => [styles.backButton, pressed && styles.iconPressed]}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <Text style={styles.title}>Support</Text>
        <View style={styles.headerRightSpace} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 18) + 22 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrap}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact Support</Text>
            <Text style={styles.cardSubtitle}>
              Describe the issue or feedback and we'll get back to you.
            </Text>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Subject (optional)</Text>
            <TextInput
              value={subject}
              onChangeText={handleSubjectChange}
              placeholder="Short summary"
              style={styles.input}
            />
            <Text style={styles.hintText}>{countWords(subject)}/{MAX_SUBJECT_WORDS} words</Text>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Message</Text>
            <TextInput
              value={message}
              onChangeText={handleMessageChange}
              placeholder="Describe your issue or feedback"
              multiline
              numberOfLines={6}
              style={[styles.input, { height: 140, textAlignVertical: 'top' }]}
            />
            <Text style={styles.hintText}>{countWords(message)}/{MAX_MESSAGE_WORDS} words</Text>

            <Pressable
              style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
              disabled={isSubmitting}
              onPress={handleSubmit}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>Submit</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    
  },

  header: {
    minHeight: 76,
    paddingHorizontal: 22,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E3EAF4',
  },

  iconPressed: {
    backgroundColor: '#F1F5F9',
  },

  backIcon: {
    fontSize: 40,
    lineHeight: 40,
    color: '#7B8798',
    marginTop: -3,
  },

  title: {
    flex: 1,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },

  headerRightSpace: {
    width: 32,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E3EAF4',
    padding: 18,
  },
  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: 18,
  },

  contentWrap: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },

  cardSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#667085',
  },
  inputLabel: {
    marginTop: 8,
    fontSize: 13,
    color: '#475467',
    fontWeight: '600',
  },

  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E3EAF4',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: '#0F172A',
  },

  hintText: {
    marginTop: 6,
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
  },

  submitButton: {
    marginTop: 14,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  buttonDisabled: {
    opacity: 0.6,
  },
});