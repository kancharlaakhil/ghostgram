import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ReceivedRequestsScreen() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUser = auth().currentUser;

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = firestore()
      .collection('users')
      .doc(currentUser.uid)
      .onSnapshot(async (doc) => {
        const data = doc.data();
        const received = data?.receivedRequests || [];

        if (received.length === 0) {
          setRequests([]);
          setLoading(false);
          return;
        }

        const userDocs = await Promise.all(
          received.map(uid =>
            firestore().collection('users').doc(uid).get()
          )
        );

        const users = userDocs
          .filter(doc => doc.exists)
          .map(doc => ({ uid: doc.id, ...doc.data() }));

        setRequests(users);
        setLoading(false);
      });

    return () => unsubscribe();
  }, []);

  const handleAccept = async (senderUid) => {
    const receiverUid = currentUser.uid;

    try {
      const receiverRef = firestore().collection('users').doc(receiverUid);
      const senderRef = firestore().collection('users').doc(senderUid);
      await receiverRef.update({
        friends: firestore.FieldValue.arrayUnion(senderUid),
        receivedRequests: firestore.FieldValue.arrayRemove(senderUid)
      });

      await senderRef.update({
        friends: firestore.FieldValue.arrayUnion(receiverUid),
        sentRequests: firestore.FieldValue.arrayRemove(receiverUid)
      });

      Alert.alert('Success', 'Friend request accepted');
    } catch (err) {
      console.error('Accept error:', err);
      Alert.alert('Error', 'Could not accept request');
    }
  };

  const handleReject = async (senderUid) => {
    const receiverUid = currentUser.uid;

    try {
      const receiverRef = firestore().collection('users').doc(receiverUid);
      const senderRef = firestore().collection('users').doc(senderUid);
      await receiverRef.update({
        receivedRequests: firestore.FieldValue.arrayRemove(senderUid)
      });

      await senderRef.update({
        sentRequests: firestore.FieldValue.arrayRemove(receiverUid)
      });

      Alert.alert('Request Rejected');
    } catch (err) {
      console.error('Reject error:', err);
      Alert.alert('Error', 'Could not reject request');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.userBox}>
      <Text style={styles.name}>{item.name}</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#34C759' }]}
          onPress={() => handleAccept(item.uid)}
        >
          <Text style={styles.btnText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#FF3B30' }]}
          onPress={() => handleReject(item.uid)}
        >
          <Text style={styles.btnText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e90ff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
    <View style={{ flex: 1, padding: 10 }}>
      <Text style={styles.heading}>Received Friend Requests</Text>
      <FlatList
        data={requests}
        keyExtractor={item => item.uid}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.empty}>No pending requests</Text>
        }
      />
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 16,
    color: '#111',
  },
  userBox: {
    backgroundColor: '#fafafa',
    padding: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#888',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

