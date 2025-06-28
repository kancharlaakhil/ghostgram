import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function AddFriendsScreen() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const currentUser = auth().currentUser;
        if (!currentUser) return;

        const userDoc = await firestore()
          .collection('users')
          .where('uid', '==', currentUser.uid)
          .get();

        if (userDoc.empty) return;

        const myData = userDoc.docs[0].data();
        const myCollege = myData.college;
        const myUID = currentUser.uid;

        const sameCollegeUsers = await firestore()
          .collection('users')
          .where('college', '==', myCollege)
          .get();

        const filtered = sameCollegeUsers.docs
          .map(doc => doc.data())
          .filter(user => user.uid !== myUID);

        setUsers(filtered);
      } catch (err) {
        console.error('Error fetching users:', err);
        Alert.alert('Error', 'Could not fetch users.');
      }
    };

    fetchUsers();
  }, []);

  const addFriend = async (friendUID) => {
    const myUID = auth().currentUser.uid;
    const userRef = firestore().collection('users').doc(myUID);

    try {
      await userRef.update({
        friends: firestore.FieldValue.arrayUnion(friendUID),
      });
      Alert.alert('Success', 'Friend added!');
    } catch (err) {
      console.error('Error adding friend:', err);
      Alert.alert('Error', 'Failed to add friend.');
    }
  };

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <Text style={styles.heading}>Add Friends</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => (
          <View style={styles.userBox}>
            <Text>{item.name}</Text>
            <TouchableOpacity onPress={() => addFriend(item.uid)} style={styles.button}>
              <Text style={{ color: 'white' }}>Add</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No users found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 22, textAlign: 'center', marginBottom: 10 },
  userBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  button: {
    backgroundColor: 'green',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
});
