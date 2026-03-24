import React, { useEffect, useState } from "react";
import LoadingSpinner from "../../containers/LoadingSpinner";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";

export default function Thank_you() {
  const { successPage } = useParams();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  setTimeout(function () {
    setIsLoading(false);
  }, 1200);

  return (
    <>
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="thankyoupage">
          <div className="login-content-registering">
            <div className="thanktext">
              <div className="logo-content">
                <Link
                  to="/"
                  className="logo-content-saasot"
                >
                  <h1>
                  Saasot
                  </h1>
                </Link>
              </div>

              <p>
                Thank you for registering yourself at Saasot.
                {!successPage && (
                  <>
                    <br /> An email has been sent to your registered email Id.
                    <br /> Kindly verify the email to login and start using our
                    services
                  </>
                )}
                {successPage && (
                  <>
                    <br /> Please login to continue
                  </>
                )}
              </p>
              <div className="center mt-2 thankyoudiv">
                <Link
                  to="/"
                  className="btn btn-primary Large thankbutton border-radius"
                >
                  Log In
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
