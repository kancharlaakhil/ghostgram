import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Button,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  Linking,
} from 'react-native';
import {
  Camera,
  useCameraPermission,
} from 'react-native-vision-camera';
import {
  Canvas,
  Image as SkiaImage,
  useImage,
  Group,
  Skia,
  Blur,
} from '@shopify/react-native-skia';
import ViewShot from 'react-native-view-shot';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import FaceDetection from '@react-native-ml-kit/face-detection';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import * as FileSystem from 'expo-file-system';

export default function SnapUploadScreen({ navigation }) {
  const cameraRef = useRef(null);
  const viewShotRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [faces, setFaces] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedGender, setSelectedGender] = useState(null);
  const [cameraPosition, setCameraPosition] = useState('back');
  const [device, setDevice] = useState(null);

  const imageSkia = useImage(photoUri || '');
  const { hasPermission, requestPermission } = useCameraPermission();

  useEffect(() => {
    (async () => {
      const cameraStatus = await requestPermission();
      const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();

      const cameraDenied = cameraStatus === false || (await Camera.getCameraPermissionStatus()) === 'denied';
      const mediaDenied = mediaStatus === 'denied';

      if (cameraDenied || mediaDenied) {
        Alert.alert(
          'Permissions Required',
          'Camera and media access are required. Enable them in settings and reopen the camera.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      const allDevices = await Camera.getAvailableCameraDevices();
      const selected = allDevices.find(d => d.position === cameraPosition);
      setDevice(selected);
    })();
  }, [cameraPosition]);

  const detectFacesAndSet = async (uri) => {
    const detected = await FaceDetection.detect(uri);
    const foundFaces = detected.map(f => f.frame);
    if (foundFaces.length === 0) {
      Alert.alert('No Faces Detected', 'At least one face must be visible to send a snap.');
    }
    setFaces(foundFaces);
  };

  const takePhoto = async () => {
    if (!cameraRef.current || !cameraReady) return;
    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        qualityPrioritization: 'quality',
      });
      const uri = photo.path.startsWith('file://') ? photo.path : 'file://' + photo.path;
      setPhotoUri(uri);
      await detectFacesAndSet(uri);
    } catch (err) {
      console.error('Photo error:', err);
      Alert.alert('Failed to take photo');
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setPhotoUri(uri);
        await detectFacesAndSet(uri);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Failed to pick image');
    }
  };

  const toggleCamera = () => {
    setCameraPosition(prev => (prev === 'back' ? 'front' : 'back'));
    setCameraReady(false);
  };

  const sendSnap = async () => {
    if (!photoUri || !selectedGender) {
      Alert.alert('Missing Info', 'Please select a gender and capture a photo first.');
      return;
    }
    if (faces.length === 0) {
      Alert.alert('No Faces Detected', 'At least one face must be visible to send a snap.');
      return;
    }

    setUploading(true);
    try {
      const uri = await viewShotRef.current.capture();
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const currentUser = auth().currentUser;
      const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
      const userData = userDoc.data();
      const directFriends = userData?.friends || [];
      
      if (directFriends.length === 0) {
        Alert.alert('No Friends', 'Please add your friends first.');
        setUploading(false);
        return;
      }

      const secondDegreeSet = new Set();
      const friendDocs = await firestore()
        .collection('users')
        .where(firestore.FieldPath.documentId(), 'in', directFriends)
        .get();

      friendDocs.forEach(doc => {
        const theirFriends = doc.data().friends || [];
        for (const uid of theirFriends) {
          if (uid !== currentUser.uid && !directFriends.includes(uid)) {
            secondDegreeSet.add(uid);
          }
        }
      });

      const secondDegreeUIDs = Array.from(secondDegreeSet);
      if (secondDegreeUIDs.length === 0) {
        Alert.alert('No 2nd-degree Friends', 'No 2nd-degree friends match your selected gender.');
        setUploading(false);
        return;
      }
      const secondDegreeDocs = secondDegreeUIDs.length > 0
        ? await firestore()
            .collection('users')
            .where(firestore.FieldPath.documentId(), 'in', secondDegreeUIDs)
            .get()
        : { docs: [] };

      const filtered2ndUIDs = secondDegreeDocs.docs
        .filter(doc => {
          const gender = doc.data().gender;
          return selectedGender === 'both' || gender === selectedGender;
        })
        .map(doc => doc.id);

      if (filtered2ndUIDs.length === 0) {
        Alert.alert('No 2nd-degree Friends', 'No 2nd-degree friends match your selected gender.');
        setUploading(false);
        return;
      }
      const timestamp = firestore.FieldValue.serverTimestamp();

      await Promise.all(
        filtered2ndUIDs.map(async (uid) => {
          const chatQuery = await firestore()
            .collection('chats')
            .where('participants', 'in', [
              [currentUser.uid, uid],
              [uid, currentUser.uid],
            ])
            .limit(1)
            .get();

          let chatId;
          if (chatQuery.empty) {
            const chatRef = await firestore().collection('chats').add({
              participants: [currentUser.uid, uid],
              isAnonymous: true,
              createdAt: timestamp,
            });
            chatId = chatRef.id;
          } else {
            chatId = chatQuery.docs[0].id;
          }

          await firestore()
            .collection('chats')
            .doc(chatId)
            .collection('messages')
            .add({
              text: '',
              imageBase64: base64,
              senderId: currentUser.uid,
              senderName: 'Anonymous',
              isAnonymous: true,
              timestamp,
            });
        })
      );

      Alert.alert('Success', 'Snap sent!');
      setPhotoUri(null);
      setFaces([]);
      setSelectedGender(null);
      navigation.goBack();
    } catch (err) {
      console.error('SendSnap Error:', err);
      Alert.alert('Error', 'Failed to send snap.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {!photoUri && !device ? (
        <View style={styles.centered}>
          <Text>Loading camera...</Text>
        </View>
      ) : !photoUri ? (
        <>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            device={device}
            isActive={true}
            photo={true}
            onInitialized={() => setCameraReady(true)}
            onError={e => Alert.alert('Camera Error', e?.message || 'Unknown error')}
          />
          <View style={styles.buttonRow}>
            <Button title="Take Photo" onPress={takePhoto} disabled={!cameraReady} />
            <Button title="Flip Camera" onPress={toggleCamera} />
            <Button title="Pick from Gallery" onPress={pickFromGallery} />
          </View>
        </>
      ) : (
        <>
          <ViewShot ref={viewShotRef} style={{ width: 360, height: 480 }} options={{ format: 'jpg', quality: 0.7 }}>
            <Canvas style={{ width: 360, height: 480 }}>
              {imageSkia && (
                <>
                  <SkiaImage image={imageSkia} x={0} y={0} width={400} height={480} />
                  {faces.map((face, i) => {
                    const { left, top, width, height } = face;
                    const path = Skia.Path.Make();
                    path.addRect({ x: left, y: top, width, height });
                    return (
                      <Group key={i} clip={{ path, op: 'intersect' }}>
                        <SkiaImage image={imageSkia} x={0} y={0} width={400} height={480}>
                          <Blur blur={20} />
                        </SkiaImage>
                      </Group>
                    );
                  })}
                </>
              )}
            </Canvas>
          </ViewShot>

          <View style={styles.buttonRow}>
            <Button title="Retake" onPress={() => { setPhotoUri(null); setFaces([]); }} />
          </View>

          <View style={styles.genderRow}>
            {['Male', 'Female', 'both'].map(g => (
              <TouchableOpacity
                key={g}
                onPress={() => setSelectedGender(g)}
                style={[styles.genderButton, selectedGender === g && styles.genderSelected]}
              >
                <Text style={{ color: selectedGender === g ? 'white' : 'black' }}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button title="Send Snap to 2nd-degree connections" onPress={sendSnap} />
        </>
      )}
      {uploading && (
        <View style={styles.uploading}>
          <ActivityIndicator size="large" color="green" />
          <Text>Uploading...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginVertical: 10 },
  genderRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10 },
  genderButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
    borderWidth: 1,
    marginHorizontal: 5,
  },
  genderSelected: { backgroundColor: 'green', borderColor: 'green' },
  uploading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: 'center',
  },
});
