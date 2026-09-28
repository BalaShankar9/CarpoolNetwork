export function createProfilePhotos(h){
  const {api,esc,openSheet,closeSheet,showToast}=h;
  async function edit(){try{
    const d=await api('/api/profile-photo');
    openSheet(`<h2>Your profile photo</h2><p>Choose a clear photo of yourself, with one visible face. No identity recognition is performed. Photos are reviewed before publication.</p>${d.photo?`<p>Status: ${esc(d.photo.status)}. ${esc(d.photo.reviewNote)}</p>`:''}<form id="profilePhotoForm" class="simple-form"><label>Choose a photo<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required ${d.available?'':'disabled'}></label><p>We crop to a square thumbnail and remove image metadata. Your approved photo appears on your public profile and ride listings.</p><label class="location-check"><input name="publicProfile" type="checkbox" required> This is my photo and I agree to show it on my Carpool Network profile.</label><p id="photoStatus" role="status"></p><button class="primary-btn" ${d.available?'':'disabled'}>Submit for review</button></form>`);
    document.querySelector('#profilePhotoForm').onsubmit=async e=>{
      e.preventDefault();const form=e.currentTarget,button=form.querySelector('button'),status=document.querySelector('#photoStatus');button.disabled=true;
      try{
        const file=form.photo.files[0];if(!file||file.size>10*1024*1024)throw Error('Choose a photo smaller than 10 MB.');
        const image=await createImageBitmap(file);if(image.width<160||image.height<160){image.close();throw Error('Choose a clearer photo at least 160 pixels wide and tall.');}
        let faceNote='Your photo will be checked by a moderator.';
        if('FaceDetector' in window){try{const faces=await new FaceDetector({maxDetectedFaces:2,fastMode:true}).detect(image);faceNote=faces.length===1?'One face found. A moderator will review the photo.':'Automatic face detection was inconclusive. A moderator will review the photo.';}catch{/* Manual review remains required. */}}
        const canvas=document.createElement('canvas');canvas.width=canvas.height=384;const ctx=canvas.getContext('2d');const size=Math.min(image.width,image.height);ctx.drawImage(image,(image.width-size)/2,(image.height-size)/2,size,size,0,0,384,384);image.close();
        const jpeg=canvas.toDataURL('image/jpeg',0.78).split(',')[1];if(jpeg.length>180000)throw Error('This photo is too large. Try a simpler head-and-shoulders photo.');
        await api('/api/profile-photo',{method:'POST',body:JSON.stringify({jpeg,publicProfile:form.publicProfile.checked})});status.textContent=faceNote+' You can check the review status here.';button.textContent='Submitted';
      }catch(error){status.textContent=error.message;button.disabled=false;}
    };
  }catch(e){showToast(e.message,'error');}}
  async function review(){try{
    const d=await api('/api/admin/profile-photos');
    openSheet(`<h2>Profile photo reviews</h2><p>Approve only a clear, appropriate photograph of one person. This checks the photo’s suitability, not legal identity or ownership of the image.</p>${d.photos.map(p=>`<button class="outline-btn" data-photo-review="${esc(p.user_id)}">Review ${esc(p.name)}</button>`).join('')||'<p>No photos awaiting review.</p>'}`);
    document.querySelectorAll('[data-photo-review]').forEach(b=>b.onclick=async()=>{try{
      const id=b.dataset.photoReview,photo=await api('/api/admin/profile-photos/'+encodeURIComponent(id));
      openSheet(`<h2>Review profile photo</h2><img class="photo-review-preview" src="${photo.image}" alt="Submitted profile photo"><form id="photoDecision" class="simple-form"><label>Decision<select name="status"><option value="rejected">Request a replacement</option><option value="approved">Approve this photo</option></select></label><label>Review note<input name="note" maxlength="300" placeholder="Explain any replacement request"></label><button class="primary-btn">Save review</button></form>`);
      document.querySelector('#photoDecision').onsubmit=async e=>{e.preventDefault();try{await api('/api/admin/profile-photos/'+encodeURIComponent(id),{method:'POST',body:JSON.stringify({...Object.fromEntries(new FormData(e.currentTarget)),key:photo.key})});await review();}catch(error){showToast(error.message,'error');}};
    }catch(error){showToast(error.message,'error');}});
  }catch(error){showToast(error.message,'error');}}
  return {edit,review};
}
