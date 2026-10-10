(function(root){
  "use strict";
  // Printed IDs are permanent: never derive them from current label spelling/order.
  const assignments = {
  "receiving-compression-sleeves": {
    "id": "receiving-compression-sleeves",
    "stage": "Receiving and Sorting",
    "product": "Compression sleeves",
    "demoReady": true
  },
  "cleaning-compression-sleeves": {
    "id": "cleaning-compression-sleeves",
    "stage": "Cleaning / Decontamination",
    "product": "Compression sleeves",
    "demoReady": true
  },
  "inspection-compression-sleeves": {
    "id": "inspection-compression-sleeves",
    "stage": "Inspection",
    "product": "Compression sleeves",
    "demoReady": true
  },
  "packaging-compression-sleeves": {
    "id": "packaging-compression-sleeves",
    "stage": "Packaging",
    "product": "Compression sleeves",
    "demoReady": true
  },
  "cleaning-disposable-pulse-ox-sensors": {
    "id": "cleaning-disposable-pulse-ox-sensors",
    "stage": "Cleaning / Decontamination",
    "product": "Disposable pulse-ox sensors",
    "demoReady": true
  },
  "functional-testing-disposable-pulse-ox-sensors": {
    "id": "functional-testing-disposable-pulse-ox-sensors",
    "stage": "Functional Testing",
    "product": "Disposable pulse-ox sensors",
    "demoReady": true
  },
  "packaging-disposable-pulse-ox-sensors": {
    "id": "packaging-disposable-pulse-ox-sensors",
    "stage": "Packaging",
    "product": "Disposable pulse-ox sensors",
    "demoReady": true
  },
  "inspection-ecg-leads-patient-cables": {
    "id": "inspection-ecg-leads-patient-cables",
    "stage": "Inspection",
    "product": "ECG leads/patient cables",
    "demoReady": true
  },
  "functional-testing-ecg-leads-patient-cables": {
    "id": "functional-testing-ecg-leads-patient-cables",
    "stage": "Functional Testing",
    "product": "ECG leads/patient cables",
    "demoReady": true
  },
  "packaging-ecg-leads-patient-cables": {
    "id": "packaging-ecg-leads-patient-cables",
    "stage": "Packaging",
    "product": "ECG leads/patient cables",
    "demoReady": true
  },
  "inspection-tourniquet-cuffs": {
    "id": "inspection-tourniquet-cuffs",
    "stage": "Inspection",
    "product": "Tourniquet cuffs",
    "demoReady": true
  },
  "packaging-tourniquet-cuffs": {
    "id": "packaging-tourniquet-cuffs",
    "stage": "Packaging",
    "product": "Tourniquet cuffs",
    "demoReady": true
  },
  "cleaning-air-transfer": {
    "id": "cleaning-air-transfer",
    "stage": "Cleaning / Decontamination",
    "product": "Air-transfer products",
    "demoReady": true
  },
  "inspection-arthroscopic-shaver-blades": {
    "id": "inspection-arthroscopic-shaver-blades",
    "stage": "Inspection",
    "product": "Arthroscopic shaver blades",
    "demoReady": true
  },
  "packaging-manifolds": {
    "id": "packaging-manifolds",
    "stage": "Packaging",
    "product": "Manifolds",
    "demoReady": true
  }
};
  Object.values(assignments).forEach(Object.freeze);Object.freeze(assignments);
  function parse(value){
    if(String(value||" ").trim()==="ARR-ACTION:1:end-shift")return {id:"end-shift",action:"end"};
    const match=/^ARR-STATION:1:([a-z0-9-]+)$/.exec(String(value||"").trim());
    if(!match||!Object.hasOwn(assignments,match[1]))return null;
    return {...assignments[match[1]]};
  }
  root.ARRStationQR=Object.freeze({parse,list:()=>Object.values(assignments).map(a=>({...a}))});
})(globalThis);
