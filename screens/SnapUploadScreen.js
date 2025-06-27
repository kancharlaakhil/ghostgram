import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Button,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Text,
} from 'react-native';
import { Camera, useCameraDevices, useCameraPermission, useMicrophonePermission } from 'react-native-vision-camera';
import FaceDetection from '@react-native-ml-kit/face-detection';
import * as ImageManipulator from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db, auth } from '../firebaseConfig';

export default function SnapUploadScreen({ navigation }) {
  const cameraRef = useRef(null);
  const [photoUri, setPhotoUri] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { hasPermission: camPerm, requestPermission: requestCam } = useCameraPermission();
  const { hasPermission: micPerm, requestPermission: requestMic } = useMicrophonePermission();

  const devices = useCameraDevices();
  const device = devices.back;

  useEffect(() => {
    (async () => {
      if (!camPerm) await requestCam();
      if (!micPerm) await requestMic();
    })();
  }, []);

  const takePhoto = async () => {
    if (!cameraRef.current) return;

    const photo = await cameraRef.current.takePhoto({
      flash: 'off',
      qualityPrioritization: 'quality',
    });

    const uri = 'file://' + photo.path;
    setPhotoUri(uri);
  };

  const blurFacesAndUpload = async () => {
    if (!photoUri) return;

    setUploading(true);
    try {
      const resized = await ImageManipulator.manipulateAsync(photoUri, [{ resize: { width: 720 } }]);
      const faces = await FaceDetection.detectFromFile(resized.uri);
      let blurredUri = resized.uri;

      for (const face of faces) {
        const { left, top, width, height } = face.bounds;

        const croppedBlurred = await ImageManipulator.manipulateAsync(
          blurredUri,
          [
            { crop: { originX: left, originY: top, width, height } },
            { resize: { width: 10, height: 10 } },
            { resize: { width, height } },
          ],
          { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
        );

        blurredUri = croppedBlurred.uri;
      }

      const response = await fetch(blurredUri);
      const blob = await response.blob();

      const fileRef = ref(storage, `snaps/${auth.currentUser.uid}/${Date.now()}.jpg`);
      await uploadBytes(fileRef, blob);
      const downloadURL = await getDownloadURL(fileRef);

      await addDoc(collection(db, 'snaps'), {
        from: auth.currentUser.uid,
        imageUrl: downloadURL,
        genderFilter: 'both',
        createdAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Snap uploaded with blurred faces!');
      setPhotoUri(null);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to upload snap.');
    } finally {
      setUploading(false);
    }
  };

  if (!device || !camPerm || !micPerm) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="blue" />
        <Text>Loading camera permissions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!photoUri ? (
        <>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            device={device}
            isActive={true}
            photo={true}
          />
          <Button title="Take Photo" onPress={takePhoto} />
        </>
      ) : (
        <>
          <Image source={{ uri: photoUri }} style={styles.image} />
          <Button title="Blur Faces & Upload" onPress={blurFacesAndUpload} />
          <Button title="Retake" onPress={() => setPhotoUri(null)} />
        </>
      )}
      {uploading && <ActivityIndicator size="large" color="green" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: 500, marginVertical: 10 },
});
