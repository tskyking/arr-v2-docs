import {
  USER_LOGIN_REQUEST,
  USER_LOGIN_SUCCESS,
  USER_LOGIN_FAIL,
  USER_LOGOUT,
  USER_REGISTER_REQUEST,
  USER_REGISTER_SUCCESS,
  USER_REGISTER_FAIL,
  USER_DETAILS_REQUEST,
  USER_DETAILS_SUCCESS,
  USER_DETAILS_FAIL,
  USER_DETAILS_RESET,
  USER_UPDATE_PROFILE_REQUEST,
  USER_UPDATE_PROFILE_SUCCESS,
  USER_UPDATE_PROFILE_FAIL,
  USER_PORTFOLIO_REQUEST,
  USER_PORTFOLIO_SUCCESS,
  USER_PORTFOLIO_FAIL,
  GET_PROFILE_RATING_CREATOR_REQUEST,
  GET_PROFILE_RATING_CREATOR_SUCCESS,
  GET_PROFILE_RATING_CREATOR_FAIL,
  GET_PROFILE_RATING_AGENCY_REQUEST,
  GET_PROFILE_RATING_AGENCY_SUCCESS,
  GET_PROFILE_RATING_AGENCY_FAIL,
  GET_CREATOR_PROFILE_JOBS_INPROGRESS_FAILURE,
  GET_CREATOR_PROFILE_JOBS_INPROGRESS_REQUEST,
  GET_CREATOR_PROFILE_JOBS_INPROGRESS_SUCCESS,
  MEMBER_PROFILE_APPROVER_JOBS_INPROGRESS_FAILURE,
  MEMBER_PROFILE_APPROVER_JOBS_INPROGRESS_REQUEST,
  MEMBER_PROFILE_APPROVER_JOBS_INPROGRESS_SUCCESS,
  MEMBER_PROFILE_MARKETER_JOBS_INPROGRESS_FAILURE,
  MEMBER_PROFILE_MARKETER_JOBS_INPROGRESS_REQUEST,
  MEMBER_PROFILE_MARKETER_JOBS_INPROGRESS_SUCCESS,
  MEMBER_PROFILE_ADMIN_JOBS_INPROGRESS_SUCCESS,
  MEMBER_PROFILE_ADMIN_JOBS_INPROGRESS_REQUEST,
  MEMBER_PROFILE_ADMIN_JOBS_INPROGRESS_FAILURE,
  CLEAR_CACHE_SUCCESS,
  CLEAR_CACHE_FAILURE,
  CLEAR_CACHE_REQUEST,
} from "../../constants/auth-constants";
import axios from "axios";
import api from "../../utils/api";
import { BACKEND_API_URL } from "../../environment";

import { CLINET_SH0W_CSV_FILES_RESET } from "../../constants/Admin-saasot-constants";

export const cachecleaner = () => async (dispatch, getState) => {
  try {
    dispatch({
      type: CLEAR_CACHE_REQUEST,
    });

    const {
      authReducer: { userData },
    } = getState();

    const config = {
      headers: {
        "Content-type": "application/json",
        Authorization: `Bearer ${userData.token}`,
      },
    };

    const { data } = await api.get(`${BACKEND_API_URL}invoice/clear-user-cache/`, config);
    dispatch({
      type: CLEAR_CACHE_SUCCESS,
      payload: data[0],
    });
    return true;
  } catch (error) {
    if (error?.response?.data) {
      dispatch({
        type: CLEAR_CACHE_FAILURE,
        payload:
          error.response && error.response.data.detail
            ? error.response.data.detail
            : error.response.data,
      });
    }
  }
};

export const register = (params) => async (dispatch) => {
  try {
    dispatch({
      type: USER_REGISTER_REQUEST,
    });

    const { data } = await api.post(`${BACKEND_API_URL}auth/register/`, params);

    dispatch({
      type: USER_REGISTER_SUCCESS,
      payload: data,
    });

    return true;
  } catch (error) {
    dispatch({
      type: USER_REGISTER_FAIL,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message,
    });
  }
};

export const login = (params) => async (dispatch) => {
  try {
    dispatch({
      type: USER_LOGIN_REQUEST,
    });

    // const { data } = await axios.post(`${BACKEND_API_URL}loginview/`, params);
    const { data } = await axios.post(`${BACKEND_API_URL}auth/login/`, params);

    dispatch({
      type: USER_LOGIN_SUCCESS,
      payload: data,
    });
    localStorage.setItem("userData", JSON.stringify(data));
  } catch (error) {
    dispatch({
      type: USER_LOGIN_FAIL,
      payload: error.response.data.message
        ? error.response.data.message
        : error.response.data,
    });
  }
};

export const getUserDetails = () => async (dispatch, getState) => {
  try {
    dispatch({
      type: USER_DETAILS_REQUEST,
    });

    const {
      authReducer: { userData },
    } = getState();

    const config = {
      headers: {
        "Content-type": "application/json",
        Authorization: `Bearer ${userData.token}`,
      },
    };

    const { data } = await api.get(`${BACKEND_API_URL}edit-profile/`, config);
    dispatch({
      type: USER_DETAILS_SUCCESS,
      payload: data[0],
    });
    return true;
  } catch (error) {
    if (error?.response?.data) {
      dispatch({
        type: USER_DETAILS_FAIL,
        payload:
          error.response && error.response.data.detail
            ? error.response.data.detail
            : error.response.data,
      });
    }
  }
};

export const getUserPortfolio =
  (userId, page) => async (dispatch, getState) => {
    try {
      dispatch({
        type: USER_PORTFOLIO_REQUEST,
      });

      const {
        authReducer: { userData },
      } = getState();

      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${userData.token}`,
        },
      };

      const { data } = await api.get(
        `${BACKEND_API_URL}user-portfolio?user=${userId}&page=${page}`,
        config
      );
      dispatch({
        type: USER_PORTFOLIO_SUCCESS,
        payload: data,
      });
      return true;
    } catch (error) {
      dispatch({
        type: USER_PORTFOLIO_FAIL,
        payload:
          error.response && error.response.data.detail
            ? error.response.data.detail
            : error.response.data,
      });
    }
  };

export const updateProfile = (params) => async (dispatch, getState) => {
  try {
    dispatch({
      type: USER_UPDATE_PROFILE_REQUEST,
    });

    const {
      authReducer: { userData },
    } = getState();

    const config = {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${userData.token}`,
      },
    };

    const { data } = await api.post(
      `${BACKEND_API_URL}edit-profile/`,
      params,
      config
    );

    dispatch({
      type: USER_UPDATE_PROFILE_SUCCESS,
      payload: data,
    });

    dispatch({
      type: USER_LOGIN_SUCCESS,
      payload: data,
    });

    localStorage.setItem("userData", JSON.stringify(data));
  } catch (error) {
    if (error?.response?.data) {
      dispatch({
        type: USER_UPDATE_PROFILE_FAIL,
        payload:
          error.response && error.response.data.detail
            ? error.response.data.detail
            : error.response.data,
      });
    }
  }
};

export const logout = () => (dispatch) => {
  localStorage.removeItem("userData");
  dispatch({ type: USER_LOGOUT });
  dispatch({ type: USER_DETAILS_RESET });
  dispatch({ type: CLINET_SH0W_CSV_FILES_RESET });
};

export const getCreatorProfileJobsInProgressAction =
  () => async (dispatch, getState) => {
    try {
      dispatch({
        type: GET_CREATOR_PROFILE_JOBS_INPROGRESS_REQUEST,
      });

      const {
        authReducer: { userData },
      } = getState();

      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${userData.token}`,
        },
      };

      const { data } = await api.get(
        `${BACKEND_API_URL}creator/creator-job-count/`,
        config
      );

      dispatch({
        type: GET_CREATOR_PROFILE_JOBS_INPROGRESS_SUCCESS,
        payload: data,
      });

      return true;
    } catch (error) {
      dispatch({
        type: GET_CREATOR_PROFILE_JOBS_INPROGRESS_FAILURE,
        payload:
          error.response && error.response.data.detail
            ? error.response.data.detail
            : error.message,
      });
    }
  };

export const MemberApproverJobsInProgressAction =
  () => async (dispatch, getState) => {
    try {
      dispatch({
        type: MEMBER_PROFILE_APPROVER_JOBS_INPROGRESS_REQUEST,
      });

      const {
        authReducer: { userData },
      } = getState();

      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${userData.token}`,
        },
      };

      const { data } = await api.get(
        `${BACKEND_API_URL}members/member-approver-job-list/`,
        config
      );

      dispatch({
        type: MEMBER_PROFILE_APPROVER_JOBS_INPROGRESS_SUCCESS,
        payload: data,
      });

      return true;
    } catch (error) {
      dispatch({
        type: MEMBER_PROFILE_APPROVER_JOBS_INPROGRESS_FAILURE,
        payload:
          error.response && error.response.data.detail
            ? error.response.data.detail
            : error.message,
      });
    }
  };

export const getMemberAdminProfileJobsInProgressAction =
  () => async (dispatch, getState) => {
    try {
      dispatch({
        type: MEMBER_PROFILE_ADMIN_JOBS_INPROGRESS_REQUEST,
      });

      const {
        authReducer: { userData },
      } = getState();

      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${userData.token}`,
        },
      };

      const { data } = await api.get(
        `${BACKEND_API_URL}members/member-job-count/`,
        config
      );

      dispatch({
        type: MEMBER_PROFILE_ADMIN_JOBS_INPROGRESS_SUCCESS,
        payload: data,
      });

      return true;
    } catch (error) {
      dispatch({
        type: MEMBER_PROFILE_ADMIN_JOBS_INPROGRESS_FAILURE,
        payload:
          error.response && error.response.data.detail
            ? error.response.data.detail
            : error.message,
      });
    }
  };

export const MemberMarketerJobsInProgressAction =
  () => async (dispatch, getState) => {
    try {
      dispatch({
        type: MEMBER_PROFILE_MARKETER_JOBS_INPROGRESS_REQUEST,
      });

      const {
        authReducer: { userData },
      } = getState();

      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${userData.token}`,
        },
      };

      const { data } = await api.get(
        `${BACKEND_API_URL}members/member-marketer-job/`,
        config
      );

      dispatch({
        type: MEMBER_PROFILE_MARKETER_JOBS_INPROGRESS_SUCCESS,
        payload: data,
      });

      return true;
    } catch (error) {
      dispatch({
        type: MEMBER_PROFILE_MARKETER_JOBS_INPROGRESS_FAILURE,
        payload:
          error.response && error.response.data.detail
            ? error.response.data.detail
            : error.message,
      });
    }
  };

export const getAgencyRatingDetails = () => async (dispatch, getState) => {
  try {
    dispatch({
      type: GET_PROFILE_RATING_AGENCY_REQUEST,
    });

    const {
      authReducer: { userData },
    } = getState();

    const config = {
      headers: {
        "Content-type": "application/json",
        Authorization: `Bearer ${userData.token}`,
      },
    };
    const { data } = await api.get(
      `${BACKEND_API_URL}agency/job-feedback/`,
      config
    );
    dispatch({
      type: GET_PROFILE_RATING_AGENCY_SUCCESS,
      payload: data[0],
    });
    return true;
  } catch (error) {
    if (error?.response?.data) {
      dispatch({
        type: GET_PROFILE_RATING_AGENCY_FAIL,
        payload:
          error.response && error.response.data.message
            ? error.response.data.message
            : error.response.data,
      });
    }
  }
};

// export const getCreatorRatingDetails = () => async (dispatch, getState) => {
//   try {
//     dispatch({
//       type: GET_PROFILE_RATING_CREATOR_REQUEST,
//     });

//     const {
//       authReducer: { userData },
//     } = getState();

//     const config = {
//       headers: {
//         "Content-type": "application/json",
//         Authorization: `Bearer ${userData.token}`,
//       },
//     };
//     const { data } = await api.get(
//       `${BACKEND_API_URL}creator/job-feedback/`,
//       config
//     );
//     dispatch({
//       type: GET_PROFILE_RATING_CREATOR_SUCCESS,
//       payload: data,
//     });
//     return true;
//   } catch (error) {
//     if (error?.response?.data) {
//       dispatch({
//         type: GET_PROFILE_RATING_CREATOR_FAIL,
//         payload:
//           error.response && error.response.data.message
//             ? error.response.data.message
//             : error.response.data,
//       });
//     }
//   }
// };

export const getCreatorRatingDetails =
  (search, ordering) => async (dispatch, getState) => {
    try {
      dispatch({
        type: GET_PROFILE_RATING_CREATOR_REQUEST,
      });

      const {
        authReducer: { userData },
      } = getState();

      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${userData.token}`,
        },
      };
      const { data } = await api.get(
        `${BACKEND_API_URL}creator/job-feedback/?search=${search}&ordering=${ordering}`,

        config
      );

      dispatch({
        type: GET_PROFILE_RATING_CREATOR_SUCCESS,
        payload: data,
      });
      return true;
    } catch (error) {
      if (error?.response?.data) {
        dispatch({
          type: GET_PROFILE_RATING_CREATOR_FAIL,
          payload:
            error.response && error.response.data.message
              ? error.response.data.message
              : error.response.data,
        });
      }
    }
  };
