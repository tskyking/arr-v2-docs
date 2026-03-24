import React from "react";
import "./spinner.css";

export default function LoadingSpinner() {
  return (
    <div className="spinner-container-bg">
      <div className="spinner-container">
        <div className="loading-spinner">
            <img className="loader-svg" src={process.env.PUBLIC_URL + "/img/loader.svg"} alt="" />
        </div>
      </div>
    </div>
  );
}