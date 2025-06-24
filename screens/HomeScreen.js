import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  or
} from 'firebase/firestore';

export default function HomeScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [userUid, setUserUid] = useState(null);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setUserUid(currentUser.uid);

    // Listen for chats that include the user
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChats(chatList);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => null,
      headerRight: () => (
        <TouchableOpacity
          onPress={async () => {
            await signOut(auth);
            navigation.replace('Login');
          }}
          style={{ marginRight: 2 }}
        >
          <Ionicons name="log-out-outline" size={25} color="red" />
        </TouchableOpacity>
      )
    });
  }, [navigation]);

  const renderChatItem = ({ item }) => {
    const otherUid = item.participants.find(uid => uid !== userUid);
    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => navigation.navigate('Chat', { chatId: item.id })}
      >
        <Text style={styles.chatTitle}>
          {item.isAnonymous ? 'Anonymous Chat' : item.displayName || `Chat with ${otherUid}`}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={item => item.id}
        renderItem={renderChatItem}
        ListEmptyComponent={<Text style={styles.empty}>No chats yet</Text>}
      />

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={() => navigation.navigate('SnapUpload')}
          style={styles.iconButton}
        >
          <Ionicons name="camera" size={30} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('AddFriends')}
          style={styles.iconButton}
        >
          <MaterialIcons name="person-add-alt-1" size={30} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  chatItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '500'
  },
  empty: {
    textAlign: 'center',
    marginTop: 20,
    color: 'gray'
  },
  bottomBar: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center'
  },
  iconButton: {
    backgroundColor: '#1e90ff',
    padding: 16,
    borderRadius: 50,
    elevation: 4
  }
});
