import {
  LOADER_REQUEST,
  LOADER_SUCCESS,
} from "../../constants/other-constants";

export const defaultPageLoader = () => async (dispatch) => {
  dispatch({
    type: LOADER_REQUEST,
  });

  // dispatch({
  //   type: LOADER_SUCCESS,
  // });
  setTimeout(() => {
    dispatch({
      type: LOADER_SUCCESS,
    });
  }, 1200);
  // document.addEventListener(
  //   "readystatechange",
  //   function (evt) {
  //     switch (evt.target.readyState) {
  //       case "complete":
  //         alert("test");
  //         setTimeout(() => {
  //           dispatch({
  //             type: LOADER_SUCCESS,
  //           });
  //         }, 1200);
  //         break;
  //     }
  //   },
  //   false
  // );
  return true;
};
