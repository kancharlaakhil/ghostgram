import React, { useState } from 'react';
import { View, TextInput, Button, FlatList, Text, StyleSheet, Switch } from 'react-native';

export default function ChatScreen({ route }) {
  const { chatId, userName } = route.params;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Replace with Firestore send logic
    const newMsg = {
      text: input,
      sender: isAnonymous ? 'Anonymous' : userName,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
  };

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <View style={styles.toggleRow}>
        <Text>Send as {isAnonymous ? 'Anonymous' : 'Named'}</Text>
        <Switch value={isAnonymous} onValueChange={setIsAnonymous} />
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <Text style={{ marginVertical: 2 }}><Text style={{ fontWeight: 'bold' }}>{item.sender}:</Text> {item.text}</Text>
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
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  input: { borderWidth: 1, padding: 10, marginVertical: 10 }
});
