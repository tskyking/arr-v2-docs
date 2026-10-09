(function(root){
  "use strict";
  const assignments=Object.freeze({
    "cleaning-air-transfer":Object.freeze({
      id:"cleaning-air-transfer",
      stage:"Cleaning / Decontamination",
      product:"Air-transfer products",
      demoReady:true,
    }),
    "inspection-arthroscopic-shaver-blades":Object.freeze({
      id:"inspection-arthroscopic-shaver-blades",
      stage:"Inspection",
      product:"Arthroscopic shaver blades",
      demoReady:true,
    }),
  });
  function parse(value){
    const match=/^ARR-STATION:1:([a-z0-9-]+)$/.exec(String(value||"").trim());
    if(!match||!assignments[match[1]])return null;
    return {...assignments[match[1]]};
  }
  root.ARRStationQR=Object.freeze({parse});
})(globalThis);
