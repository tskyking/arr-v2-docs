import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { defaultPageLoader } from "../../redux/actions/other-actions";
import LoadingSpinner from "../../containers/LoadingSpinner";

export default function Error() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(defaultPageLoader());
  }, []);

  const { loading } = useSelector((state) => state.loaderReducer);

  return (
    <>
      {loading && <LoadingSpinner />}

      <div className="container">
        <div id="i13g" className="row">
          <div id="iuwh" style={{ textAlign: "center" }} className="cell">
            <img className="error" src="img/new.svg" alt="" />
            {/* <img
                      src="img/error.jpg"
                      id="ilsq"
                      className="container"
                      style={{ width: "60%" }}
                    /> */}
          </div>
        </div>
      </div>
    </>
  );
}
