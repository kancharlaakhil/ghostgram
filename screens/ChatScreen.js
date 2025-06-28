import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  Button,
  FlatList,
  Text,
  StyleSheet,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function ChatScreen({ route }) {
  const { chatId, userName } = route.params;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .onSnapshot(snapshot => {
        const msgList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(msgList);
      });

    return () => unsubscribe();
  }, [chatId]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    try {
      await firestore()
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .add({
          text: input.trim(),
          senderId: auth().currentUser.uid,
          senderName: isAnonymous ? 'Anonymous' : userName,
          isAnonymous,
          timestamp: firestore.FieldValue.serverTimestamp(),
        });

      setInput('');
    } catch (err) {
      console.error('Send message error:', err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <View style={{ flex: 1, padding: 10 }}>
        <View style={styles.toggleRow}>
          <Text>Send as {isAnonymous ? 'Anonymous' : 'Named'}</Text>
          <Switch value={isAnonymous} onValueChange={setIsAnonymous} />
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Text style={styles.messageText}>
              <Text style={{ fontWeight: 'bold' }}>{item.senderName || 'User'}:</Text> {item.text}
            </Text>
          )}
        />

        <TextInput
          placeholder="Type a message..."
          value={input}
          onChangeText={setInput}
          style={styles.input}
        />
        <Button title="Send" onPress={sendMessage} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
  },
  messageText: {
    marginVertical: 4,
  },
});
