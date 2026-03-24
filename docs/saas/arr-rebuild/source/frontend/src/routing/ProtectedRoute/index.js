// import React from "react";
// import { useSelector } from "react-redux";
// import { Navigate } from "react-router-dom";

// export default function ProtectedRoute({ children }) {
//   const { userData } = useSelector((state) => state.authReducer);

//   return userData?.user.role == 0 ||
//     userData?.user.role == 1 ||
//     userData?.user.role == 2 ||
//     userData?.user.role == 3 ? (
//     children
//   ) : (
//     <Navigate to="/" />
//   );
// }


import React from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const { userData } = useSelector((state) => state.authReducer);

  return userData?.user?.name ? (
    children
  ) : (
    <Navigate to="/" />
  );
}
