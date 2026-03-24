import { fontFamily } from "@mui/system";
import React from "react";

const EmailTemplates = () => {
  return (
    <>
      {/* Hello world */}

      <div style={{ background: "rgba(36,114,252,0.06)!important" }}>
        <table
          style={{
            font: "Arial,sans-serif",
            borderCollapse: "collapse",
            width: 600,
            margin: "0 auto",
          }}
          width={600}
          cellPadding={0}
          cellSpacing={0}
        >
          <tbody>
            <tr>
              <td
                style={{
                  width: "100%",
                  // float: "left",
                  // textAlign: "center",
                  margin: "36px 0 0",
                }}
              >
                <div
                  style={{
                    // marginTop: 20,
                    padding: "34px 44px",
                    borderRadius: "8px!important",
                    background: "#fff",
                    border: "1px solid #dddddd5e",
                    marginBottom: 50,
                    marginTop: 50,
                  }}
                >
                  <div className="email-logo">
                    <img style={{ width: "165px" }} src="/img/logonew.svg" />
                  </div>
                  <a href="#" />

                  <div className="welcome-text" style={{ paddingTop: "80px" }}>
                    <h1 style={{ font: "24px" }}>
                      Welcome{" "}
                      <span className="welcome-hand" style={{}}>
                        👋
                      </span>
                    </h1>
                  </div>
                  <div className="welcome-paragraph">
                    <div
                      style={{
                        padding: "20px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      Welcome to Adifect!
                    </div>
                    <div
                      style={{
                        padding: "10px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      Please click the link below to verify your email
                      <br />
                      address.
                    </div>
                    <div
                      style={{
                        padding: "20px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      Sincerely, <br />
                      The Adifect Team
                    </div>
                  </div>
                  <div
                    style={{ paddingTop: "40px" }}
                    className="confirm-email-button"
                  >
                    <button
                      style={{
                        height: "56px",
                        padding: "15px 44px",
                        background: "#2472FC",
                        borderRadius: "8px",
                        borderStyle: "none",
                        color: "white",
                        fontSize: "16px",
                      }}
                    >
                      Confirm Email Address
                    </button>
                  </div>

                  <div
                    style={{ padding: "50px 0px" }}
                    className="email-bottom-para"
                  >
                    <div
                      style={{
                        padding: "20px 0px",
                        fontSize: "16px",
                        color: "#384860",
                        // fontFamily: "Gilroy-Regular",
                      }}
                    >
                      This email was sent by Adifect. If you'd rather not
                      receive this kind of email, Don’t want any more emails
                      from Adifect?{" "}
                      <a href="#">
                        {" "}
                        <span style={{ textDecoration: "underline" }}>
                          Unsubscribe.
                        </span>{" "}
                      </a>
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      © 2022 Adifect
                    </div>
                  </div>
                  {/* <a
                    href="{FRONTEND_SITE_URL}/reset-password/{token}/{user.id}/"
                    style={{
                      padding: "16px 19px",
                      borderRadius: 4,
                      textDecoration: "none",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      fontFamily: "arial",
                      background: "#2472fc",
                    }}
                  >
                    {" "}
                    Reset Password{" "}
                  </a> 
                  {/* 
                  <p
                    style={{
                      fontSize: 14,
                      fontFamily: "arial",
                      margin: "45px 0 10px",
                    }}
                  >
                    {" "}
                    Contact us: 1-800-123-45-67 I mailto:info@adifect.com{" "}
                  </p> */}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SECOND PAGE */}

      <div style={{ background: "rgba(36,114,252,0.06)!important" }}>
        <table
          style={{
            font: "Arial,sans-serif",
            borderCollapse: "collapse",
            width: 600,
            margin: "0 auto",
          }}
          width={600}
          cellPadding={0}
          cellSpacing={0}
        >
          <tbody>
            <tr>
              <td
                style={{
                  width: "100%",
                  // float: "left",
                  // textAlign: "center",
                  margin: "36px 0 0",
                }}
              >
                <div
                  style={{
                    // marginTop: 20,
                    padding: "34px 44px",
                    borderRadius: "8px!important",
                    background: "#fff",
                    border: "1px solid #dddddd5e",
                    marginBottom: 50,
                    marginTop: 50,
                  }}
                >
                  <div className="email-logo">
                    <img style={{ width: "165px" }} src="/img/logonew.svg" />
                  </div>
                  <a href="#" />

                  <div className="welcome-text" style={{ paddingTop: "80px" }}>
                    <h1 style={{ font: "24px" }}>Hello, </h1>
                  </div>
                  <div className="welcome-paragraph">
                    <div
                      style={{
                        padding: "10px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      You have been invited to join Adifect! Please click the
                      link below to
                      <br />
                      create your account.
                    </div>
                    <div
                      style={{
                        padding: "20px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      Sincerely, <br />
                      The Adifect Team
                    </div>
                  </div>
                  <div
                    style={{ paddingTop: "40px" }}
                    className="create-new-account"
                  >
                    <button
                      style={{
                        height: "56px",
                        padding: "15px 44px",
                        background: "#2472FC",
                        borderRadius: "8px",
                        borderStyle: "none",
                        color: "white",
                        fontSize: "16px",
                      }}
                    >
                      Create New Account
                    </button>
                  </div>

                  <div
                    style={{ padding: "50px 0px" }}
                    className="email-bottom-para"
                  >
                    <div
                      style={{
                        padding: "20px 0px",
                        fontSize: "16px",
                        color: "#384860",
                        // fontFamily: "Gilroy-Regular",
                      }}
                    >
                      This email was sent by Adifect. If you'd rather not
                      receive this kind of email, Don’t want any more emails
                      from Adifect?{" "}
                      <a href="#">
                        {" "}
                        <span style={{ textDecoration: "underline" }}>
                          Unsubscribe.
                        </span>{" "}
                      </a>
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      © 2022 Adifect
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* THIRD PAGE */}

      <div style={{ background: "rgba(36,114,252,0.06)!important" }}>
        <table
          style={{
            font: "Arial,sans-serif",
            borderCollapse: "collapse",
            width: 600,
            margin: "0 auto",
          }}
          width={600}
          cellPadding={0}
          cellSpacing={0}
        >
          <tbody>
            <tr>
              <td
                style={{
                  width: "100%",
                  // float: "left",
                  // textAlign: "center",
                  margin: "36px 0 0",
                }}
              >
                <div
                  style={{
                    // marginTop: 20,
                    padding: "34px 44px",
                    borderRadius: "8px!important",
                    background: "#fff",
                    border: "1px solid #dddddd5e",
                    marginBottom: 50,
                    marginTop: 50,
                  }}
                >
                  <div className="email-logo">
                    <img style={{ width: "165px" }} src="/img/logonew.svg" />
                  </div>
                  <a href="#" />

                  <div className="welcome-text" style={{ paddingTop: "80px" }}>
                    <h1 style={{ font: "24px" }}>Opps, </h1>
                  </div>
                  <div className="welcome-paragraph">
                    <div
                      style={{
                        padding: "10px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      looks like you have forgotten your password.
                      <br /> Please click the link below to reset your
                      <br /> password!
                    </div>
                    <div
                      style={{
                        padding: "20px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      Sincerely, <br />
                      The Adifect Team
                    </div>
                  </div>
                  <div
                    style={{ paddingTop: "40px" }}
                    className="create-new-account"
                  >
                    <button
                      style={{
                        height: "56px",
                        padding: "15px 44px",
                        background: "#2472FC",
                        borderRadius: "8px",
                        borderStyle: "none",
                        color: "white",
                        fontSize: "16px",
                      }}
                    >
                      Reset Password
                    </button>
                  </div>

                  <div
                    style={{ padding: "50px 0px" }}
                    className="email-bottom-para"
                  >
                    <div
                      style={{
                        padding: "20px 0px",
                        fontSize: "16px",
                        color: "#384860",
                        // fontFamily: "Gilroy-Regular",
                      }}
                    >
                      This email was sent by Adifect. If you'd rather not
                      receive this kind of email, Don’t want any more emails
                      from Adifect?{" "}
                      <a href="#">
                        {" "}
                        <span style={{ textDecoration: "underline" }}>
                          Unsubscribe.
                        </span>{" "}
                      </a>
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      © 2022 Adifect
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* FOURTH PAGE */}

      <div style={{ background: "rgba(36,114,252,0.06)!important" }}>
        <table
          style={{
            font: "Arial,sans-serif",
            borderCollapse: "collapse",
            width: 600,
            margin: "0 auto",
          }}
          width={600}
          cellPadding={0}
          cellSpacing={0}
        >
          <tbody>
            <tr>
              <td
                style={{
                  width: "100%",
                  // float: "left",
                  // textAlign: "center",
                  margin: "36px 0 0",
                }}
              >
                <div
                  style={{
                    // marginTop: 20,
                    padding: "34px 44px",
                    borderRadius: "8px!important",
                    background: "#fff",
                    border: "1px solid #dddddd5e",
                    marginBottom: 50,
                    marginTop: 50,
                  }}
                >
                  <div className="email-logo">
                    <img style={{ width: "165px" }} src="/img/logonew.svg" />
                  </div>
                  <a href="#" />

                  <div className="welcome-text" style={{ paddingTop: "80px" }}>
                    <h1 style={{ font: "24px" }}>Hello [Name], </h1>
                  </div>
                  <div className="welcome-paragraph">
                    <div
                      style={{
                        padding: "10px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      You have a new Approval that needs your attention! <br />
                      Please view the asset below or click the link to be
                      navigated to the <br />
                      Adifect site.
                    </div>
                    <div
                      style={{
                        backgroundColor: "rgba(36, 114, 252, 0.1)",
                        borderRadius: "8px",
                      }}
                    >
                      <div style={{ padding: "20px" }}>
                        <div>
                          <img src="/img/Rectangle26.png" />
                          <span
                            style={{
                              fontSize: "14px",
                              color: "#2472FC",
                              fontWeight: "700",
                              marginBottom: "0px",
                              padding: "0px 14px",
                            }}
                          >
                            John delivered the work
                          </span>
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#A0A0A0",
                              fontWeight: "500",
                              marginBottom: "0px",
                            }}
                          >
                            17 June, 01:00PM
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "16px",
                            color: "#000000",
                            paddingLeft: "54px",
                          }}
                        >
                          Here I`m delivering the work with changes.
                          <br /> I hope you like it.
                        </div>
                        <div style={{ padding: "11px 54px 0px" }}>
                          <img src="/img/Rectangle20.png" />{" "}
                          <img src="/img/Rectangle19.png" />
                        </div>
                        <div style={{ display: "flex" }}>
                          <div style={{ padding: "15px 0px 0px 63px" }}>
                            <img src="/img/VectorDownload.png" />{" "}
                            <span
                              style={{ color: "#2472FC", fontSize: "14px" }}
                            >
                              Docum...
                            </span>
                          </div>
                          <div style={{ padding: "15px 0px 0px 30px" }}>
                            <img src="/img/VectorDownload.png" />{" "}
                            <span
                              style={{ color: "#2472FC", fontSize: "14px" }}
                            >
                              Docum...
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "20px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    ></div>
                    Sincerely, <br />
                    The Adifect Team
                  </div>
                  <div
                    style={{ paddingTop: "40px" }}
                    className="create-new-account"
                  >
                    <button
                      style={{
                        height: "56px",
                        padding: "15px 44px",
                        background: "#2472FC",
                        borderRadius: "8px",
                        borderStyle: "none",
                        color: "white",
                        fontSize: "16px",
                      }}
                    >
                      View Asset on Adifect
                    </button>
                  </div>

                  <div
                    style={{ padding: "50px 0px" }}
                    className="email-bottom-para"
                  >
                    <div
                      style={{
                        padding: "20px 0px",
                        fontSize: "16px",
                        color: "#384860",
                        // fontFamily: "Gilroy-Regular",
                      }}
                    >
                      This email was sent by Adifect. If you'd rather not
                      receive this kind of email, Don’t want any more emails
                      from Adifect?{" "}
                      <a href="#">
                        {" "}
                        <span style={{ textDecoration: "underline" }}>
                          Unsubscribe.
                        </span>{" "}
                      </a>
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      © 2022 Adifect
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* FIFTH PAGE */}

      <div style={{ background: "rgba(36,114,252,0.06)!important" }}>
        <table
          style={{
            font: "Arial,sans-serif",
            borderCollapse: "collapse",
            width: 600,
            margin: "0 auto",
          }}
          width={600}
          cellPadding={0}
          cellSpacing={0}
        >
          <tbody>
            <tr>
              <td
                style={{
                  width: "100%",
                  // float: "left",
                  // textAlign: "center",
                  margin: "36px 0 0",
                }}
              >
                <div
                  style={{
                    // marginTop: 20,
                    padding: "34px 44px",
                    borderRadius: "8px!important",
                    background: "#fff",
                    border: "1px solid #dddddd5e",
                    marginBottom: 50,
                    marginTop: 50,
                  }}
                >
                  <div className="email-logo">
                    <img style={{ width: "165px" }} src="/img/logonew.svg" />
                  </div>
                  <a href="#" />

                  <div className="welcome-text" style={{ paddingTop: "80px" }}>
                    <h1 style={{ font: "24px" }}>Hello [Name], </h1>
                  </div>
                  <div className="welcome-paragraph">
                    <div
                      style={{
                        padding: "10px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      There has been update to your job:
                    </div>
                    <div
                      style={{
                        boxShadow: "0px 4px 40px rgb(36 114 252 / 6%)",
                        borderRadius: "0px 8px 8px 0",
                        marginTop: "10px",
                        display: "flex",
                      }}
                    >
                      <div
                        style={{
                          width: "13px",
                          backgroundColor: "#2472fc",
                          borderRadius: "50px",
                        }}
                      ></div>
                      <div>
                        <div style={{ padding: "20px" }}>
                          <div>
                            <h1 style={{ font: "24px" }}>
                              Marketing campaign job for adifect{" "}
                            </h1>
                          </div>
                          <div
                            style={{
                              padding: "13px 0px",
                              fontSize: "16px",
                              color: "#384860",
                            }}
                          >
                            In vehicula orci maecenas egestas sodales at.
                            Senectus nec dolor id pulvinar. Vitae fringilla
                            phasellus amet semper sagittis, neque. Sed a sed
                            diam senectus diam. Arcu tellus ullamcorper volutpat
                            id{" "}
                          </div>
                          <div>
                            <button
                              style={{
                                backgroundColor: "rgba(36, 114, 252, 0.08)",
                                borderRadius: "30px",
                                // fontFamily: "Inter",
                                fontStyle: "normal",
                                fontWeight: 600,
                                fontSize: "15px",
                                lineHeight: "18px",
                                textAlign: "center",
                                border: "none",
                                color: "#2472FC",
                                padding: "8px 20px 8px 20px",
                              }}
                            >
                              In Progress
                            </button>
                          </div>
                          <div
                            style={{
                              // fontFamily: "Gilroy-Bold",
                              fontSize: "16px",
                              lineHeight: "19px",
                              color: "rgba(0, 0, 0, 0.7)",
                              fontWeight: "bold",
                              padding: "15px 0px",
                            }}
                          >
                            Due on:{" "}
                            <span style={{ padding: "0px 12px" }}>
                              06-02-2022
                            </span>
                          </div>
                          <div style={{ display: "flex" }}>
                            <div>
                              <button
                                style={{
                                  backgroundColor: "rgba(36, 114, 252, 0.08)",
                                  borderRadius: "30px",
                                  // fontFamily: "Inter",
                                  fontStyle: "normal",
                                  fontWeight: 600,
                                  fontSize: "15px",
                                  lineHeight: "18px",
                                  textAlign: "center",
                                  border: "none",
                                  color: "#2472FC",
                                  padding: "8px 20px 8px 20px",
                                }}
                              >
                                Marketing
                              </button>
                            </div>
                            <div style={{ padding: "0px 7px" }}>
                              <button
                                style={{
                                  backgroundColor: "rgba(36, 114, 252, 0.08)",
                                  borderRadius: "30px",
                                  // fontFamily: "Inter",
                                  fontStyle: "normal",
                                  fontWeight: 600,
                                  fontSize: "15px",
                                  lineHeight: "18px",
                                  textAlign: "center",
                                  border: "none",
                                  color: "#2472FC",
                                  padding: "8px 20px 8px 20px",
                                }}
                              >
                                Digital Marketing
                              </button>
                            </div>
                            <div>
                              <button
                                style={{
                                  backgroundColor: "rgba(36, 114, 252, 0.08)",
                                  borderRadius: "30px",
                                  // fontFamily: "Inter",
                                  fontStyle: "normal",
                                  fontWeight: 600,
                                  fontSize: "15px",
                                  lineHeight: "18px",
                                  textAlign: "center",
                                  border: "none",
                                  color: "#2472FC",
                                  padding: "8px 20px 8px 20px",
                                }}
                              >
                                Ad Campaign
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "10px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      Please click the link below to view the new updates.{" "}
                    </div>
                    <div
                      style={{
                        padding: "20px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    ></div>
                    Sincerely, <br />
                    The Adifect Team
                  </div>

                  <div style={{ paddingTop: "40px" }}>
                    <button
                      style={{
                        height: "56px",
                        padding: "15px 44px",
                        background: "#2472FC",
                        borderRadius: "8px",
                        borderStyle: "none",
                        color: "white",
                        fontSize: "16px",
                      }}
                    >
                      View Job Update{" "}
                    </button>
                  </div>

                  <div
                    style={{ padding: "50px 0px" }}
                    className="email-bottom-para"
                  >
                    <div
                      style={{
                        padding: "20px 0px",
                        fontSize: "16px",
                        color: "#384860",
                        // fontFamily: "Gilroy-Regular",
                      }}
                    >
                      This email was sent by Adifect. If you'd rather not
                      receive this kind of email, Don’t want any more emails
                      from Adifect?{" "}
                      <a href="#">
                        {" "}
                        <span style={{ textDecoration: "underline" }}>
                          Unsubscribe.
                        </span>{" "}
                      </a>
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      © 2022 Adifect
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SIXTH PAGE */}

      <div style={{ background: "rgba(36,114,252,0.06)!important" }}>
        <table
          style={{
            font: "Arial,sans-serif",
            borderCollapse: "collapse",
            width: 600,
            margin: "0 auto",
          }}
          width={600}
          cellPadding={0}
          cellSpacing={0}
        >
          <tbody>
            <tr>
              <td
                style={{
                  width: "100%",
                  // float: "left",
                  // textAlign: "center",
                  margin: "36px 0 0",
                }}
              >
                <div
                  style={{
                    // marginTop: 20,
                    padding: "34px 44px",
                    borderRadius: "8px!important",
                    background: "#fff",
                    border: "1px solid #dddddd5e",
                    marginBottom: 50,
                    marginTop: 50,
                  }}
                >
                  <div className="email-logo">
                    <img style={{ width: "165px" }} src="/img/logonew.svg" />
                  </div>
                  <a href="#" />

                  <div className="welcome-text" style={{ paddingTop: "80px" }}>
                    <h1 style={{ font: "24px" }}>Congratulations! 🎉</h1>
                  </div>
                  <div className="welcome-paragraph">
                    <div
                      style={{
                        padding: "10px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      You have a job that has just been completed!
                    </div>
                    <div
                      style={{
                        boxShadow: "0px 4px 40px rgb(36 114 252 / 6%)",
                        borderRadius: "0px 8px 8px 0",
                        marginTop: "10px",
                        display: "flex",
                      }}
                    >
                      <div
                        style={{
                          width: "13px",
                          backgroundColor: "#59CF65",
                          borderRadius: "50px",
                        }}
                      ></div>
                      <div>
                        <div style={{ padding: "20px" }}>
                          <div>
                            <h1 style={{ font: "24px" }}>
                              Marketing campaign job for adifect{" "}
                            </h1>
                          </div>
                          <div
                            style={{
                              padding: "13px 0px",
                              fontSize: "16px",
                              color: "#384860",
                            }}
                          >
                            In vehicula orci maecenas egestas sodales at.
                            Senectus nec dolor id pulvinar. Vitae fringilla
                            phasellus amet semper sagittis, neque. Sed a sed
                            diam senectus diam. Arcu tellus ullamcorper volutpat
                            id{" "}
                          </div>
                          <div>
                            <button
                              style={{
                                backgroundColor: "rgba(36, 114, 252, 0.08)",
                                borderRadius: "30px",
                                // fontFamily: "Inter",
                                fontStyle: "normal",
                                fontWeight: 600,
                                fontSize: "15px",
                                lineHeight: "18px",
                                textAlign: "center",
                                border: "none",
                                color: "#59CF65",
                                padding: "8px 20px 8px 20px",
                              }}
                            >
                              Complete
                            </button>
                          </div>
                          <div
                            style={{
                              // fontFamily: "Gilroy-Bold",
                              fontSize: "16px",
                              lineHeight: "19px",
                              color: "rgba(0, 0, 0, 0.7)",
                              fontWeight: "bold",
                              padding: "15px 0px",
                            }}
                          >
                            Due on:{" "}
                            <span style={{ padding: "0px 12px" }}>
                              06-02-2022
                            </span>
                          </div>
                          <div style={{ display: "flex" }}>
                            <div>
                              <button
                                style={{
                                  backgroundColor: "rgba(36, 114, 252, 0.08)",
                                  borderRadius: "30px",
                                  // fontFamily: "Inter",
                                  fontStyle: "normal",
                                  fontWeight: 600,
                                  fontSize: "15px",
                                  lineHeight: "18px",
                                  textAlign: "center",
                                  border: "none",
                                  color: "#2472FC",
                                  padding: "8px 20px 8px 20px",
                                }}
                              >
                                Marketing
                              </button>
                            </div>
                            <div style={{ padding: "0px 7px" }}>
                              <button
                                style={{
                                  backgroundColor: "rgba(36, 114, 252, 0.08)",
                                  borderRadius: "30px",
                                  // fontFamily: "Inter",
                                  fontStyle: "normal",
                                  fontWeight: 600,
                                  fontSize: "15px",
                                  lineHeight: "18px",
                                  textAlign: "center",
                                  border: "none",
                                  color: "#2472FC",
                                  padding: "8px 20px 8px 20px",
                                }}
                              >
                                Digital Marketing
                              </button>
                            </div>
                            <div>
                              <button
                                style={{
                                  backgroundColor: "rgba(36, 114, 252, 0.08)",
                                  borderRadius: "30px",
                                  // fontFamily: "Inter",
                                  fontStyle: "normal",
                                  fontWeight: 600,
                                  fontSize: "15px",
                                  lineHeight: "18px",
                                  textAlign: "center",
                                  border: "none",
                                  color: "#2472FC",
                                  padding: "8px 20px 8px 20px",
                                }}
                              >
                                Ad Campaign
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "10px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      Please click the link below to view the completed job.
                    </div>
                    <div
                      style={{
                        padding: "20px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    ></div>
                    Sincerely, <br />
                    The Adifect Team
                  </div>

                  <div style={{ paddingTop: "40px" }}>
                    <button
                      style={{
                        height: "56px",
                        padding: "15px 44px",
                        background: "#2472FC",
                        borderRadius: "8px",
                        borderStyle: "none",
                        color: "white",
                        fontSize: "16px",
                      }}
                    >
                      View Completed Job{" "}
                    </button>
                  </div>

                  <div
                    style={{ padding: "50px 0px" }}
                    className="email-bottom-para"
                  >
                    <div
                      style={{
                        padding: "20px 0px",
                        fontSize: "16px",
                        color: "#384860",
                        // fontFamily: "Gilroy-Regular",
                      }}
                    >
                      This email was sent by Adifect. If you'd rather not
                      receive this kind of email, Don’t want any more emails
                      from Adifect?{" "}
                      <a href="#">
                        {" "}
                        <span style={{ textDecoration: "underline" }}>
                          Unsubscribe.
                        </span>{" "}
                      </a>
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      © 2022 Adifect
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SEVENTH PAGE */}

      <div style={{ background: "rgba(36,114,252,0.06)!important" }}>
        <table
          style={{
            font: "Arial,sans-serif",
            borderCollapse: "collapse",
            width: 600,
            margin: "0 auto",
          }}
          width={600}
          cellPadding={0}
          cellSpacing={0}
        >
          <tbody>
            <tr>
              <td
                style={{
                  width: "100%",
                  // float: "left",
                  // textAlign: "center",
                  margin: "36px 0 0",
                }}
              >
                <div
                  style={{
                    // marginTop: 20,
                    padding: "34px 44px",
                    borderRadius: "8px!important",
                    background: "#fff",
                    border: "1px solid #dddddd5e",
                    marginBottom: 50,
                    marginTop: 50,
                  }}
                >
                  <div className="email-logo">
                    <img style={{ width: "165px" }} src="/img/logonew.svg" />
                  </div>
                  <a href="#" />

                  <div className="welcome-text" style={{ paddingTop: "80px" }}>
                    <h1 style={{ font: "24px" }}>Hello [Name],</h1>
                  </div>
                  <div className="welcome-paragraph">
                    <div
                      style={{
                        padding: "10px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      You have a new Job Proposal for the job below:
                    </div>
                    <div
                      style={{
                        border: "1px solid rgba(36, 114, 252, 0.16)",
                        borderRadius: "8px",
                      }}
                    >
                      <div style={{ padding: "20px" }}>
                        <div>
                          <h1 style={{ font: "24px" }}>
                            Run campaign for a jewelry business
                          </h1>
                        </div>
                        <div
                          style={{
                            // fontFamily: "Gilroy-Bold",
                            fontSize: "16px",
                            lineHeight: "19px",
                            color: "#A0A0A0",
                          }}
                        >
                          Posted on: <span>06-02-2022</span>
                        </div>
                        <div
                          style={{
                            padding: "13px 0px",
                            fontSize: "16px",
                            color: "#384860",
                          }}
                        >
                          In vehicula orci maecenas egestas sodales at. Senectus
                          nec dolor id pulvinar.Vitae fringilla phasellus amet
                          semper sagittis,neque. Sed a sed diam senectus
                          diam.Arcu tellus ullamcorper volutpat id
                        </div>

                        <div
                          style={{
                            // fontFamily: "Gilroy-Bold",
                            fontSize: "16px",
                            lineHeight: "19px",
                            color: "#A0A0A0",
                            fontWeight: "bold",
                            // padding: "15px 0px",
                          }}
                        >
                          Budget:{" "}
                          <span style={{ padding: "0px 12px" }}>$500</span>
                        </div>
                        <div
                          style={{
                            // fontFamily: "Gilroy-Bold",
                            fontSize: "16px",
                            lineHeight: "19px",
                            color: "#A0A0A0",
                            fontWeight: "bold",
                            padding: "14px 0px",
                          }}
                        >
                          Level:{" "}
                          <span style={{ padding: "0px 28px" }}>Expert</span>
                        </div>
                        <div style={{ display: "flex" }}>
                          <div>
                            <button
                              style={{
                                backgroundColor: "rgba(36, 114, 252, 0.08)",
                                borderRadius: "30px",
                                // fontFamily: "Inter",
                                fontStyle: "normal",
                                fontWeight: 600,
                                fontSize: "15px",
                                lineHeight: "18px",
                                textAlign: "center",
                                border: "none",
                                color: "#2472FC",
                                padding: "8px 20px 8px 20px",
                              }}
                            >
                              Marketing
                            </button>
                          </div>
                          <div style={{ padding: "0px 7px" }}>
                            <button
                              style={{
                                backgroundColor: "rgba(36, 114, 252, 0.08)",
                                borderRadius: "30px",
                                // fontFamily: "Inter",
                                fontStyle: "normal",
                                fontWeight: 600,
                                fontSize: "15px",
                                lineHeight: "18px",
                                textAlign: "center",
                                border: "none",
                                color: "#2472FC",
                                padding: "8px 20px 8px 20px",
                              }}
                            >
                              Digital Marketing
                            </button>
                          </div>
                          <div>
                            <button
                              style={{
                                backgroundColor: "rgba(36, 114, 252, 0.08)",
                                borderRadius: "30px",
                                // fontFamily: "Inter",
                                fontStyle: "normal",
                                fontWeight: 600,
                                fontSize: "15px",
                                lineHeight: "18px",
                                textAlign: "center",
                                border: "none",
                                color: "#2472FC",
                                padding: "8px 20px 8px 20px",
                              }}
                            >
                              Ad Campaign
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "10px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      Please click the link below to view the Job Proposal.
                    </div>
                    <div
                      style={{
                        padding: "20px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    ></div>
                    Sincerely, <br />
                    The Adifect Team
                  </div>

                  <div style={{ paddingTop: "40px" }}>
                    <button
                      style={{
                        height: "56px",
                        padding: "15px 44px",
                        background: "#2472FC",
                        borderRadius: "8px",
                        borderStyle: "none",
                        color: "white",
                        fontSize: "16px",
                      }}
                    >
                      View Job Proposal
                    </button>
                  </div>

                  <div
                    style={{ padding: "50px 0px" }}
                    className="email-bottom-para"
                  >
                    <div
                      style={{
                        padding: "20px 0px",
                        fontSize: "16px",
                        color: "#384860",
                        // fontFamily: "Gilroy-Regular",
                      }}
                    >
                      This email was sent by Adifect. If you'd rather not
                      receive this kind of email, Don’t want any more emails
                      from Adifect?{" "}
                      <a href="#">
                        {" "}
                        <span style={{ textDecoration: "underline" }}>
                          Unsubscribe.
                        </span>{" "}
                      </a>
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      © 2022 Adifect
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 
EIGHTH PAGE */}

      <div style={{ background: "rgba(36,114,252,0.06)!important" }}>
        <table
          style={{
            font: "Arial,sans-serif",
            borderCollapse: "collapse",
            width: 600,
            margin: "0 auto",
          }}
          width={600}
          cellPadding={0}
          cellSpacing={0}
        >
          <tbody>
            <tr>
              <td
                style={{
                  width: "100%",
                  // float: "left",
                  // textAlign: "center",
                  margin: "36px 0 0",
                }}
              >
                <div
                  style={{
                    // marginTop: 20,
                    padding: "34px 44px",
                    borderRadius: "8px!important",
                    background: "#fff",
                    border: "1px solid #dddddd5e",
                    marginBottom: 50,
                    marginTop: 50,
                  }}
                >
                  <div className="email-logo">
                    <img style={{ width: "165px" }} src="/img/logonew.svg" />
                  </div>
                  <a href="#" />

                  <div className="welcome-text" style={{ paddingTop: "80px" }}>
                    <h1 style={{ font: "24px" }}>Congratulations! 🎉</h1>
                  </div>
                  <div className="welcome-paragraph">
                    <div
                      style={{
                        padding: "10px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      Your Job Proposal has been accepted!{" "}
                    </div>
                    <div
                      style={{
                        boxShadow: "0px 4px 40px rgb(36 114 252 / 6%)",
                        borderRadius: "0px 8px 8px 0",
                        marginTop: "10px",
                        display: "flex",
                      }}
                    >
                      <div
                        style={{
                          width: "13px",
                          backgroundColor: "#2472fc",
                          borderRadius: "50px",
                        }}
                      ></div>
                      <div>
                        <div style={{ padding: "20px" }}>
                          <div>
                            <h1 style={{ font: "24px" }}>
                              Marketing campaign job for adifect{" "}
                            </h1>
                          </div>
                          <div
                            style={{
                              padding: "13px 0px",
                              fontSize: "16px",
                              color: "#384860",
                            }}
                          >
                            In vehicula orci maecenas egestas sodales at.
                            Senectus nec dolor id pulvinar. Vitae fringilla
                            phasellus amet semper sagittis, neque. Sed a sed
                            diam senectus diam. Arcu tellus ullamcorper volutpat
                            id
                          </div>
                          <div>
                            <button
                              style={{
                                backgroundColor: "rgba(36, 114, 252, 0.08)",
                                borderRadius: "30px",
                                // fontFamily: "Inter",
                                fontStyle: "normal",
                                fontWeight: 600,
                                fontSize: "15px",
                                lineHeight: "18px",
                                textAlign: "center",
                                border: "none",
                                color: "#2472FC",
                                padding: "8px 20px 8px 20px",
                              }}
                            >
                              In Progress
                            </button>
                          </div>
                          <div
                            style={{
                              // fontFamily: "Gilroy-Bold",
                              fontSize: "16px",
                              lineHeight: "19px",
                              color: "rgba(0, 0, 0, 0.7)",
                              fontWeight: "bold",
                              padding: "15px 0px",
                            }}
                          >
                            Due on:{" "}
                            <span style={{ padding: "0px 12px" }}>
                              06-02-2022
                            </span>
                          </div>
                          <div
                            style={{
                              // fontFamily: "Gilroy-Bold",
                              fontSize: "16px",
                              lineHeight: "19px",
                              color: "rgba(0, 0, 0, 0.7)",
                              fontWeight: "bold",
                              // padding: "15px 0px",
                              paddingBottom: "17px",
                            }}
                          >
                            Assigned to:
                            <span
                              style={{
                                padding: "0px 12px",
                                color: "#2472FC",
                              }}
                            >
                              John Snow
                            </span>
                          </div>
                          <div style={{ display: "flex" }}>
                            <div>
                              <button
                                style={{
                                  backgroundColor: "rgba(36, 114, 252, 0.08)",
                                  borderRadius: "30px",
                                  // fontFamily: "Inter",
                                  fontStyle: "normal",
                                  fontWeight: 600,
                                  fontSize: "15px",
                                  lineHeight: "18px",
                                  textAlign: "center",
                                  border: "none",
                                  color: "#2472FC",
                                  padding: "8px 20px 8px 20px",
                                }}
                              >
                                Marketing
                              </button>
                            </div>
                            <div style={{ padding: "0px 7px" }}>
                              <button
                                style={{
                                  backgroundColor: "rgba(36, 114, 252, 0.08)",
                                  borderRadius: "30px",
                                  // fontFamily: "Inter",
                                  fontStyle: "normal",
                                  fontWeight: 600,
                                  fontSize: "15px",
                                  lineHeight: "18px",
                                  textAlign: "center",
                                  border: "none",
                                  color: "#2472FC",
                                  padding: "8px 20px 8px 20px",
                                }}
                              >
                                Digital Marketing
                              </button>
                            </div>
                            <div>
                              <button
                                style={{
                                  backgroundColor: "rgba(36, 114, 252, 0.08)",
                                  borderRadius: "30px",
                                  // fontFamily: "Inter",
                                  fontStyle: "normal",
                                  fontWeight: 600,
                                  fontSize: "15px",
                                  lineHeight: "18px",
                                  textAlign: "center",
                                  border: "none",
                                  color: "#2472FC",
                                  padding: "8px 20px 8px 20px",
                                }}
                              >
                                Ad Campaign
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "10px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      Please click the link below to view your new job.
                    </div>
                    <div
                      style={{
                        padding: "20px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    ></div>
                    Sincerely, <br />
                    The Adifect Team
                  </div>

                  <div style={{ paddingTop: "40px" }}>
                    <button
                      style={{
                        height: "56px",
                        padding: "15px 80px",
                        background: "#2472FC",
                        borderRadius: "8px",
                        borderStyle: "none",
                        color: "white",
                        fontSize: "16px",
                      }}
                    >
                      View Job
                    </button>
                  </div>

                  <div
                    style={{ padding: "50px 0px" }}
                    className="email-bottom-para"
                  >
                    <div
                      style={{
                        padding: "20px 0px",
                        fontSize: "16px",
                        color: "#384860",
                        // fontFamily: "Gilroy-Regular",
                      }}
                    >
                      This email was sent by Adifect. If you'd rather not
                      receive this kind of email, Don’t want any more emails
                      from Adifect?{" "}
                      <a href="#">
                        {" "}
                        <span style={{ textDecoration: "underline" }}>
                          Unsubscribe.
                        </span>{" "}
                      </a>
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      © 2022 Adifect
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 
NINTH PAGE */}

      <div style={{ background: "rgba(36,114,252,0.06)!important" }}>
        <table
          style={{
            font: "Arial,sans-serif",
            borderCollapse: "collapse",
            width: 600,
            margin: "0 auto",
          }}
          width={600}
          cellPadding={0}
          cellSpacing={0}
        >
          <tbody>
            <tr>
              <td
                style={{
                  width: "100%",
                  // float: "left",
                  // textAlign: "center",
                  margin: "36px 0 0",
                }}
              >
                <div
                  style={{
                    // marginTop: 20,
                    padding: "34px 44px",
                    borderRadius: "8px!important",
                    background: "#fff",
                    border: "1px solid #dddddd5e",
                    marginBottom: 50,
                    marginTop: 50,
                  }}
                >
                  <div className="email-logo">
                    <img style={{ width: "165px" }} src="/img/logonew.svg" />
                  </div>
                  <a href="#" />

                  <div className="welcome-text" style={{ paddingTop: "80px" }}>
                    <h1 style={{ font: "24px" }}>Hello [Name], </h1>
                  </div>
                  <div className="welcome-paragraph">
                    <div
                      style={{
                        padding: "10px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      There has been new activity on your job.
                    </div>
                    <div
                      style={{
                        border: "1px solid rgba(36, 114, 252, 0.16)",
                        borderRadius: "8px",
                      }}
                    >
                      <div style={{ padding: "20px" }}>
                        <div>
                          <img src="/img/Rectangle26.png" />
                          <span
                            style={{
                              fontSize: "14px",
                              color: "rgba(0, 0, 0, 0.7)",
                              fontWeight: "700",
                              marginBottom: "0px",
                              padding: "0px 14px",
                            }}
                          >
                            John sent you a message
                          </span>
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#A0A0A0",
                              fontWeight: "500",
                              marginBottom: "0px",
                            }}
                          >
                            17 June, 01:00PM
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "16px",
                            color: "#000000",
                            paddingLeft: "54px",
                          }}
                        >
                          Hi <span style={{ color: "#C315FF" }}>@tony</span>,
                          here please have a look at the progress.
                        </div>
                        <div style={{ padding: "20px 0px" }}>
                          <img src="/img/Rectangle20.png" />{" "}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "20px 0px",
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    ></div>
                    Sincerely, <br />
                    The Adifect Team
                  </div>
                  <div
                    style={{ paddingTop: "40px" }}
                    className="create-new-account"
                  >
                    <button
                      style={{
                        height: "56px",
                        padding: "15px 44px",
                        background: "#2472FC",
                        borderRadius: "8px",
                        borderStyle: "none",
                        color: "white",
                        fontSize: "16px",
                      }}
                    >
                      View Job Activity{" "}
                    </button>
                  </div>

                  <div
                    style={{ padding: "50px 0px" }}
                    className="email-bottom-para"
                  >
                    <div
                      style={{
                        padding: "20px 0px",
                        fontSize: "16px",
                        color: "#384860",
                        // fontFamily: "Gilroy-Regular",
                      }}
                    >
                      This email was sent by Adifect. If you'd rather not
                      receive this kind of email, Don’t want any more emails
                      from Adifect?{" "}
                      <a href="#">
                        {" "}
                        <span style={{ textDecoration: "underline" }}>
                          Unsubscribe.
                        </span>{" "}
                      </a>
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        color: "#384860",
                      }}
                    >
                      © 2022 Adifect
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* RESET PASSWORD PAGE */}

      <div className="reset-password-bg">
        <table className="reset-password-tab">
          <tbody>
            <tr>
              <td className="reset-password-tdata">
                <div className="reset-password-content">
                  <div className="reset-password-template-text">
                    <h1>Reset Password</h1>
                  </div>

                  <div>
                    <p className="reset-password-forgot-text">
                      Looks like you have forgotten your password. Enter your
                      new password and confirm password to reset.
                    </p>
                  </div>
                  <div className="reset-password-boxButton">
                    <p className="reset-password-text">New Password</p>
                    <input
                      className="resetPassword-box"
                      type="password"
                      placeholder="******"
                    />
                    <p className="confirmPassword-text">Confirm New Password</p>
                    <input
                      className="resetPassword-box"
                      type="password"
                      placeholder="******"
                    />
                    <p className="passwordsMatch-text">Passwords match.</p>
                  </div>
                  <div className="buttonResetPasswordCenter">
                    <button className="buttonResetPassword">
                      Reset Password
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
};

export default EmailTemplates;
