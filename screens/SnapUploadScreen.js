import React, { useState } from 'react';
import { View, Button, Image, ActivityIndicator, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function SnapUploadScreen({ navigation }) {
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ base64: false });
    if (!result.cancelled) {
      setImage(result.assets[0].uri);
    }
  };

  const blurFacesAndUpload = async () => {
    setUploading(true);
    try {
      const detection = await FaceDetector.detectFacesAsync(image, {
        mode: FaceDetector.FaceDetectorMode.fast,
        detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
        runClassifications: FaceDetector.FaceDetectorClassifications.none
      });

      let blurredImage = image;
      for (const face of detection.faces) {
        const manipResult = await ImageManipulator.manipulateAsync(
          blurredImage,
          [{
            crop: {
              originX: face.bounds.origin.x,
              originY: face.bounds.origin.y,
              width: face.bounds.size.width,
              height: face.bounds.size.height
            }
          },
          { resize: { width: 10, height: 10 } }, // pixelate face
          { resize: { width: face.bounds.size.width, height: face.bounds.size.height } }
          ],
          { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
        );
        blurredImage = manipResult.uri;
      }

      const response = await fetch(blurredImage);
      const blob = await response.blob();
      const fileRef = ref(storage, `snaps/${auth.currentUser.uid}/${Date.now()}.jpg`);
      await uploadBytes(fileRef, blob);
      const downloadURL = await getDownloadURL(fileRef);

      await addDoc(collection(db, 'snaps'), {
        from: auth.currentUser.uid,
        imageUrl: downloadURL,
        genderFilter: 'both',
        createdAt: serverTimestamp()
      });

      alert('Snap uploaded with blurred faces!');
      setImage(null);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload snap.');
    }
    setUploading(false);
  };

  return (
    <View style={styles.container}>
      <Button title="Pick a Snap" onPress={pickImage} />
      {image && <Image source={{ uri: image }} style={styles.image} />}
      {image && !uploading && <Button title="Blur Faces & Upload" onPress={blurFacesAndUpload} />}
      {uploading && <ActivityIndicator size="large" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: 300, height: 400, marginVertical: 10 }
});