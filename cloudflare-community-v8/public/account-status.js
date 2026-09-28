export function contactPresentation(contact={}){
  const saved=Boolean(contact.number&&contact.shareBookings),needsCode=contact.phone?.required===true;
  return {saved,needsCode,ready:saved&&(!needsCode||contact.phone?.verified),
    label:!saved?'Add your WhatsApp contact':needsCode&&!contact.phone?.verified?'Verify your phone number':'WhatsApp contact saved',
    description:!saved?'Add your number and agree to share it with accepted ride partners.':needsCode&&!contact.phone?.verified?'Your number is saved. Complete SMS verification to participate.':`${contact.number} · shared only with accepted ride partners.`};
}
export function accountPresentation(account){
  const contact=contactPresentation(account.contact),photo=account.photo,vehicle=account.vehicle;
  const photoCopy=photo?.hasApprovedPhoto?(photo.status==='pending'?'Your approved photo is active. Your replacement is awaiting review.':'Your approved photo is ready.'):
    photo?.status==='pending'?'Your photo is awaiting moderator approval. You do not need to upload it again.':
    photo?.status==='rejected'?`Please submit a replacement. ${photo.reviewNote||'Use a clear photo of yourself.'}`:'Add a clear photo of yourself for moderator review.';
  const vehicleCopy=vehicle?`${vehicle.make} · ${vehicle.colour} · ${vehicle.passenger_seats} passenger seats. ${vehicle.issue?.error||'Vehicle record checked. Journey dates are checked when you offer a ride.'}`:'Driving? Add your registration and passenger seats.';
  return {heading:account.canParticipate?'Your travel profile':'Get ready to travel',
    summary:(account.participationIssue?.code==='PHOTO_REQUIRED'&&photo?.status==='pending'?'Your photo is awaiting moderator approval. Your saved details are ready.':account.participationIssue?.error)||(account.canOfferToday?'You are ready to request or offer a ride. Each journey is checked when you book.':'You are ready to request a ride. Check your vehicle before offering seats.'),
    cards:[
      ['whatsappContact','whatsapp',contact.label,contact.description,'Manage contact',contact.ready?'Saved':'Action needed'],
      ['profilePhoto','user','Your profile photo',photoCopy,'Manage photo',photo?.hasApprovedPhoto?'Approved':photo?.status==='pending'?'Awaiting review':photo?.status==='rejected'?'Replacement needed':'Not added'],
      ['vehicleAndLinks','car','Vehicle & social profiles',vehicleCopy,'Manage details',vehicle?(vehicle.issue?'Check needed':'Checked'):'Not added'],
      ['socialSecurity','shield','Sign-in & privacy',account.email.verified?`${account.email.address} · Email verified`:'Verify your email to participate.','Review security',account.email.verified?'Verified':'Action needed'],
      ['communityReports','alert','Community reports','Track a concern about a member, message or listing.','View reports','']
    ]};
}
