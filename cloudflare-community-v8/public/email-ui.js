export function createEmailUI(h) {
  const {state,openSheet,closeSheet,showToast,api}=h;
  const $=selector=>document.querySelector(selector);
  const post=(path,body)=>api(path,{method:'POST',body:JSON.stringify(body)});
  return function email(purpose='signin',after) {
    if(!state.emailAvailable){showToast('Email sign-in is being set up. Use your existing PIN or recovery code.','error');return;}
    const joining=purpose==='signup';
    openSheet(`<div class="sheet-title"><span class="eyebrow">${purpose==='link'?'ACCOUNT SECURITY':'WELCOME TO CARPOOL NETWORK'}</span><h2>${purpose==='link'?'Verify your email':joining?'A good journey starts here.':'Welcome back.'}</h2><p>We will email a six-digit code. No password to remember.</p></div><form id="emailStart" class="simple-form"><label>Email address<input name="email" type="email" autocomplete="email" maxlength="254" required placeholder="you@example.com"></label>${joining?'<label>Your name<input name="name" autocomplete="name" maxlength="60" minlength="2" required></label><label>Town or area<input name="area" autocomplete="address-level2" maxlength="100" minlength="2" required placeholder="e.g. Cardiff"></label><label class="chat-only"><input name="adult" type="checkbox" required> I am 18 or older</label>':''}<p id="emailError" class="form-error" role="alert"></p><button class="primary-btn full" type="submit">Email me a code</button></form><div id="verifyStep" hidden><p id="codeSentTo" class="auth-intro"></p><form id="emailVerify" class="simple-form"><label>Six-digit code<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required placeholder="000000"></label><p id="verifyError" class="form-error" role="alert"></p><button class="primary-btn full">Verify and continue</button></form><button class="text-action" id="changeEmail">Change email or request another code</button></div>${purpose!=='link'?`<div class="auth-alternatives"><button class="outline-btn full" id="switchEmailMode">${joining?'Already a member? Sign in':'New here? Create an account'}</button><button class="text-action centered" id="otherSignIn">Use a PIN, recovery code or passkey</button></div>`:''}<p class="auth-intro">Email verification confirms access to an inbox. It does not verify your phone number or identity.</p>`);
    let challengeId='';
    $('#switchEmailMode')?.addEventListener('click',()=>email(joining?'signin':'signup',after));
    $('#otherSignIn')?.addEventListener('click',()=>h.openPinSignIn(after));
    $('#changeEmail').onclick=()=>{$('#verifyStep').hidden=true;$('#emailStart').hidden=false;$('#emailStart').querySelector('input').focus();};
    $('#emailStart').onsubmit=async e=>{
      e.preventDefault();const form=e.currentTarget,submit=form.querySelector('[type=submit]');submit.disabled=true;$('#emailError').textContent='';
      try{const d=await post('/api/auth/email/start',{...Object.fromEntries(new FormData(form)),adult:form.adult?.checked===true,purpose});challengeId=d.challengeId;form.hidden=true;$('#verifyStep').hidden=false;$('#codeSentTo').textContent=`We sent a code to ${form.email.value}. It expires in 10 minutes. Check your spam folder too.`;$('#emailVerify').code.focus();}
      catch(error){if($('#emailError'))$('#emailError').textContent=error.message;}
      finally{submit.disabled=false;}
    };
    $('#emailVerify').onsubmit=async e=>{
      e.preventDefault();const form=e.currentTarget,submit=form.querySelector('button');submit.disabled=true;$('#verifyError').textContent='';
      try{const d=await post('/api/auth/email/verify',{challengeId,code:form.code.value});h.saveProfile(d.profile);h.connectLive();closeSheet();showToast('Email verified. You are signed in.','success');if(after)await after();else h.navigate('home');}
      catch(error){if($('#verifyError'))$('#verifyError').textContent=error.message;submit.disabled=false;}
    };
  };
}
