import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [friends, setFriends] = useState([]);
  const [search, setSearch] = useState('');
  const [userData, setUserData] = useState(null);
  const [receivedCount, setReceivedCount] = useState(0);
  const [tab, setTab] = useState('friends'); // 'friends' | 'anonymous'

  useEffect(() => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;
    const uid = currentUser.uid;

    const unsubscribeUser = firestore()
      .collection('users')
      .doc(uid)
      .onSnapshot(async (doc) => {
        const data = doc.data();
        setUserData({ uid, ...data });

        setReceivedCount(data?.receivedRequests?.length || 0);

        if (data.friends?.length) {
          const friendList = await Promise.all(
            data.friends.map(async fid => {
              const userDoc = await firestore().collection('users').doc(fid).get();
              const chatSnap = await firestore()
                .collection('chats')
                .where('participants', 'in', [[uid, fid], [fid, uid]])
                .limit(1)
                .get();
              const chatId = chatSnap.docs[0]?.id;
              let lastTimestamp = new Date(0);

              if (chatId) {
                const msgSnap = await firestore()
                  .collection('chats')
                  .doc(chatId)
                  .collection('messages')
                  .orderBy('timestamp', 'desc')
                  .limit(1)
                  .get();
                lastTimestamp = msgSnap.docs[0]?.data()?.timestamp?.toDate?.() || new Date(0);
              }

              return {
                uid: userDoc.id,
                ...userDoc.data(),
                lastTimestamp,
              };
            })
          );
          const sortedFriends = friendList.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
          setFriends(sortedFriends);
        } else {
          setFriends([]);
        }
      });

    const unsubscribeChats = firestore()
      .collection('chats')
      .where('participants', 'array-contains', uid)
      .onSnapshot(async snapshot => {
        const rawChats = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        const chatsWithTimestamp = await Promise.all(
          rawChats.map(async chat => {
            const msgSnap = await firestore()
              .collection('chats')
              .doc(chat.id)
              .collection('messages')
              .orderBy('timestamp', 'desc')
              .limit(1)
              .get();

            const lastTimestamp =
              msgSnap.docs[0]?.data()?.timestamp?.toDate?.() || new Date(0);

            return { ...chat, lastTimestamp };
          })
        );

        const sortedChats = chatsWithTimestamp.sort(
          (a, b) => b.lastTimestamp - a.lastTimestamp
        );
        setChats(sortedChats);
      });

    return () => {
      unsubscribeUser();
      unsubscribeChats();
    };
  }, []);

  useEffect(() => {
  if (!userData) return;
  const uid = userData.uid;

  const unsubscribeChats = firestore()
    .collection('chats')
    .where('participants', 'array-contains', uid)
    .onSnapshot(async snapshot => {
      const rawChats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      const chatsWithTimestamp = await Promise.all(
        rawChats.map(async chat => {
          const msgSnap = await firestore()
            .collection('chats')
            .doc(chat.id)
            .collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();

          const lastTimestamp =
            msgSnap.docs[0]?.data()?.timestamp?.toDate?.() || new Date(0);

          return { ...chat, lastTimestamp };
        })
      );

      const sortedChats = chatsWithTimestamp.sort(
        (a, b) => b.lastTimestamp - a.lastTimestamp
      );
      setChats(sortedChats);
    });

  return () => unsubscribeChats();
}, [userData]);


  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => null,
      headerRight: () => (
        <TouchableOpacity
          onPress={async () => {
            await auth().signOut();
            navigation.replace('Login');
          }}
          style={{ marginRight: 10 }}
        >
          <Ionicons name="log-out-outline" size={25} color="red" />
        </TouchableOpacity>
      )
    });
  }, [navigation]);

  const renderChatItem = ({ item }) => {
    const currentUid = userData?.uid;
    const otherUid = item.participants.find(uid => uid !== currentUid);
    const isFriend = userData?.friends?.includes(otherUid);
    const nameKey = `${currentUid}_revealed`;
    const otherNameKey = `${otherUid}_revealed`;

    const chatName = () => {
      if (isFriend) {
        const friend = friends.find(f => f.uid === otherUid);
        return friend?.name || 'User';
      } else {
        if (item[nameKey] && item[otherNameKey]) {
          return item[`${otherUid}_name`] || 'User';
        } else {
          return 'Anonymous';
        }
      }
    };

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() =>
          navigation.navigate('Chat', {
            chatId: item.id,
            currentUid,
            otherUid,
            isFriend,
          })
        }
      >
        <Text style={styles.chatTitle}>{chatName()}</Text>
      </TouchableOpacity>
    );
  };

  const handleFriendTap = async (friend) => {
    const currentUid = userData?.uid;
    const existingChat = chats.find(chat =>
      chat.participants.includes(friend.uid)
    );
    let chatId = existingChat?.id;

    if (!chatId) {
      const chatRef = await firestore().collection('chats').add({
        participants: [currentUid, friend.uid],
      });
      chatId = chatRef.id;
    }

    navigation.navigate('Chat', {
      chatId,
      currentUid,
      otherUid: friend.uid,
      isFriend: true,
    });
  };

  const filteredFriends = friends
    .filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.lastTimestamp - a.lastTimestamp);

  const anonymousChats = chats
    .filter(chat => {
      const otherUid = chat.participants.find(p => p !== userData?.uid);
      return !userData?.friends?.includes(otherUid);
    })
    .sort((a, b) => b.lastTimestamp - a.lastTimestamp);

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search friends..."
        placeholderTextColor='grey'
        value={search}
        onChangeText={setSearch}
        style={styles.searchInput}
      />

      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setTab('friends')}
          style={[styles.tab, tab === 'friends' && styles.activeTab]}
        >
          <Text style={tab === 'friends' ? styles.activeTabText : styles.tabText}>Friends</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('anonymous')}
          style={[styles.tab, tab === 'anonymous' && styles.activeTab]}
        >
          <Text style={tab === 'anonymous' ? styles.activeTabText : styles.tabText}>Anonymous</Text>
        </TouchableOpacity>
      </View>

      {tab === 'friends' ? (
        <FlatList
          data={filteredFriends}
          keyExtractor={item => item.uid}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chatItem}
              onPress={() => handleFriendTap(item)}
            >
              <Text style={styles.chatTitle}>{item.name}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No matching friends</Text>}
        />
      ) : (
        <FlatList
          data={anonymousChats}
          keyExtractor={item => item.id}
          renderItem={renderChatItem}
          ListEmptyComponent={<Text style={styles.empty}>No anonymous chats</Text>}
        />
      )}

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

        <TouchableOpacity
          onPress={() => navigation.navigate('ReceivedRequests')}
          style={styles.iconButton}
        >
          <Ionicons name="person-circle-outline" size={30} color="white" />
          {receivedCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {receivedCount > 99 ? '99+' : receivedCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafe',
    paddingTop: 12,
  },
  searchInput: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
    fontSize: 16,
    color: '#000',
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 25,
    marginHorizontal: 6,
    backgroundColor: '#e6e6e6',
  },
  activeTab: {
    backgroundColor: '#1e90ff',
  },
  tabText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  chatItem: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  empty: {
    textAlign: 'center',
    marginTop: 30,
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 35,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  iconButton: {
    backgroundColor: '#1e90ff',
    padding: 14,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

