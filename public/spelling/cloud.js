import { firebaseConfig } from './firebase-config.js';
export const configured = Boolean(firebaseConfig?.projectId);
export async function connectCloud(callbacks) {
  const [appSDK, authSDK, dbSDK] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js'),
  ]);
  const app=appSDK.initializeApp(firebaseConfig);
  const auth=authSDK.getAuth(app);
  // Memory cache avoids retaining student records after sign-out on a shared device.
  const db=dbSDK.getFirestore(app);
  let user=null, subscriptions=[];
  const stop=()=>{subscriptions.forEach(fn=>fn());subscriptions=[];};
  authSDK.onAuthStateChanged(auth, next=>{
    stop(); user=next; callbacks.account(next);
    if(!next)return;
    for(const name of ['students','attempts']) {
      subscriptions.push(dbSDK.onSnapshot(dbSDK.collection(db,'teachers',next.uid,name),{includeMetadataChanges:true}, snapshot=>{
        callbacks.data(name,snapshot.docs.map(doc=>({id:doc.id,...doc.data()})));
        callbacks.sync(name, snapshot.metadata.fromCache, snapshot.metadata.hasPendingWrites);
      },callbacks.error));
    }
  });
  return {
    login:()=>authSDK.signInWithPopup(auth,new authSDK.GoogleAuthProvider()),
    logout:()=>authSDK.signOut(auth),
    async save(collection, id, data) {
      if(!user)throw new Error('Sign in to save your results.');
      // Resolve only once the server has accepted the write; never label an unconfirmed write as saved.
      await dbSDK.setDoc(dbSDK.doc(db,'teachers',user.uid,collection,id),data,{merge:true});
    },
  };
}
