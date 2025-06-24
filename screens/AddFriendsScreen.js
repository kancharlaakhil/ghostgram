import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

export default function AddFriendsScreen() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const user = auth.currentUser;
      const myDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
      const myData = myDoc.docs[0].data();
      const myCollege = myData.college;
      const myUID = user.uid;

      const q = query(collection(db, 'users'), where('college', '==', myCollege));
      const snapshot = await getDocs(q);

      const filtered = snapshot.docs
        .map(doc => doc.data())
        .filter(user => user.uid !== myUID);

      setUsers(filtered);
    };

    fetchUsers();
  }, []);

  const addFriend = async (friendUID) => {
    const myUID = auth.currentUser.uid;
    const userRef = doc(db, 'users', myUID);
    await updateDoc(userRef, { friends: arrayUnion(friendUID) });
    alert('Friend added!');
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 22, textAlign: 'center', marginBottom: 10 },
  userBox: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginVertical: 5, padding: 10,
    borderBottomWidth: 1, borderBottomColor: '#ccc',
  },
  button: { backgroundColor: 'green', padding: 5, borderRadius: 5 }
});
