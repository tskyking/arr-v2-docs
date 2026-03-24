import React from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export default function PublicRoute({ children }) {
  const { userData } = useSelector((state) => state.authReducer);

  return !userData ? children : <Navigate to="/home" />;
}
