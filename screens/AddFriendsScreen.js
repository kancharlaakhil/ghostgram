import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function AddFriendsScreen() {
  const [allCollegeUsers, setAllCollegeUsers] = useState([]);
  const [filteredSearchResults, setFilteredSearchResults] = useState([]);
  const [myData, setMyData] = useState(null);
  const [search, setSearch] = useState('');
  const currentUID = auth().currentUser?.uid;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const userDoc = await firestore().collection('users').doc(currentUID).get();
      const me = userDoc.data();
      setMyData(me);

      const sameCollegeUsers = await firestore()
        .collection('users')
        .where('college', '==', me.college)
        .get();

      const users = sameCollegeUsers.docs
        .map(doc => ({ ...doc.data(), uid: doc.id }))
        .filter(u => u.uid !== currentUID);

      setAllCollegeUsers(users);
    } catch (err) {
      console.error('Fetch error:', err);
      Alert.alert('Error', 'Could not fetch users.');
    }
  };

  const refreshMyData = async () => {
    const userDoc = await firestore().collection('users').doc(currentUID).get();
    setMyData(userDoc.data());
  };

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredSearchResults([]);
    } else {
      const lower = search.toLowerCase();
      const matched = allCollegeUsers.filter(u =>
        u.name.toLowerCase().includes(lower)
      );
      setFilteredSearchResults(matched);
    }
  }, [search, allCollegeUsers]);

  const sendFriendRequest = async (receiverUID) => {
    try {
      await firestore().collection('users').doc(currentUID).update({
        sentRequests: firestore.FieldValue.arrayUnion(receiverUID),
      });
      await firestore().collection('users').doc(receiverUID).update({
        receivedRequests: firestore.FieldValue.arrayUnion(currentUID),
      });
      Alert.alert('Request sent!');
      await refreshMyData();
    } catch (err) {
      console.error('Send Request Error:', err);
    }
  };

  const cancelRequest = async (receiverUID) => {
    try {
      await firestore().collection('users').doc(currentUID).update({
        sentRequests: firestore.FieldValue.arrayRemove(receiverUID),
      });
      await firestore().collection('users').doc(receiverUID).update({
        receivedRequests: firestore.FieldValue.arrayRemove(currentUID),
      });
      Alert.alert('Request cancelled!');
      await refreshMyData();
    } catch (err) {
      console.error('Cancel request error:', err);
    }
  };

  const unfriend = async (friendUID) => {
    try {
      // Step 1: Remove from friends list (bi-directional)
      await firestore().collection('users').doc(currentUID).update({
        friends: firestore.FieldValue.arrayRemove(friendUID),
      });
      await firestore().collection('users').doc(friendUID).update({
        friends: firestore.FieldValue.arrayRemove(currentUID),
      });

      // Step 2: Find existing chat
      const chatSnap = await firestore()
        .collection('chats')
        .where('participants', 'in', [[currentUID, friendUID], [friendUID, currentUID]])
        .limit(1)
        .get();

      const chatDoc = chatSnap.docs[0];
      if (chatDoc?.exists) {
        const chatId = chatDoc.id;

        // Step 3: Delete messages subcollection
        const messagesSnap = await firestore()
          .collection('chats')
          .doc(chatId)
          .collection('messages')
          .get();

        const batch = firestore().batch();
        messagesSnap.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        // Step 4: Delete chat document
        batch.delete(firestore().collection('chats').doc(chatId));

        await batch.commit();
      }

      Alert.alert('Unfriended and chat deleted!');
      await refreshMyData();
    } catch (err) {
      console.error('Unfriend error:', err);
      Alert.alert('Error', 'Something went wrong while unfriending.');
    }
  };

  const renderUserItem = (user) => {
    const isFriend = myData?.friends?.includes(user.uid);
    const isSent = myData?.sentRequests?.includes(user.uid);

    return (
      <View key={user.uid} style={styles.userBox}>
        <Text style={styles.userName}>{user.name}</Text>
        {isFriend ? (
          <TouchableOpacity onPress={() => unfriend(user.uid)} style={styles.buttonRed}>
            <Text style={styles.buttonText}>Unfriend</Text>
          </TouchableOpacity>
        ) : isSent ? (
          <TouchableOpacity onPress={() => cancelRequest(user.uid)} style={styles.buttonGray}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => sendFriendRequest(user.uid)} style={styles.button}>
            <Text style={styles.buttonText}>Send Request</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <Text style={styles.heading}>Add or Manage Friends</Text>

      <TextInput
        placeholder="Search users by name..."
        placeholderTextColor='grey'
        value={search}
        onChangeText={setSearch}
        style={styles.input}
      />

      {search.trim() !== '' && (
        <>
          <Text style={styles.sectionHeading}>Search Results in your College</Text>
          {filteredSearchResults.length === 0 ? (
            <Text style={{ textAlign: 'center', marginVertical: 10 }}>
              No matching users found.
            </Text>
          ) : (
            filteredSearchResults.map(renderUserItem)
          )}
        </>
      )}

      {/* Friends List */}
      <Text style={styles.sectionHeading}>Your Friends in your College</Text>
      {allCollegeUsers.filter(u => myData?.friends?.includes(u.uid)).length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 10 }}>No friends yet.</Text>
      ) : (
        allCollegeUsers
          .filter(u => myData?.friends?.includes(u.uid))
          .map(renderUserItem)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    color: '#111',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    marginHorizontal: 2,
    marginBottom: 3,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
    fontSize: 16,
    color: '#000',
  },
  userBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    marginBottom: 10,
    borderColor: '#e2e2e2',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222',
    flexShrink: 1,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  buttonGray: {
    backgroundColor: '#888',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  buttonRed: {
    backgroundColor: '#FF3B30',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: '#777',
    marginVertical: 10,
    fontSize: 14,
  },
});

