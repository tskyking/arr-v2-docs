import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Card, CardHeader, CardBody, Row, Col, Button } from "reactstrap";
import { useDropzone } from "react-dropzone";
import { useDispatch, useSelector } from "react-redux";
import { UploadFileAction } from "../../redux/actions/Admin-saasot-action";
import { Link } from "react-router-dom";
import swal from "sweetalert";
import { saveAs } from "file-saver";
import LoadingSpinner from "../../containers/LoadingSpinner";

const UploadeFiles = () => {
  const dispatch = useDispatch();
  const [openUploadFile, setopenUploadFile] = useState(false);
  const [files, setFiles] = useState([]);
  const [rerender, setRerender] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { error, UploadFile, success } = useSelector(
    (state) => state.UploadFileReducer
  );

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  

  // console.log("-------------------", UploadFile);

  const baseStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px",
    borderWidth: 2,
    borderRadius: 2,
    borderColor: "#222a425e",
    borderStyle: "dashed",
    backgroundColor: "#fafafa",
    color: "#bdbdbd",
    outline: "none",
    transition: "border .24s ease-in-out",
  };
  const videoStyle = {
    display: "block",
    width: "100%",
    Position: "relative",
  };
  const focusedStyle = {
    borderColor: "#2196f3",
  };

  const thumbsContainer = {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
  };

  const thumb = {
    // display: "inline-flex",
    // borderRadius: 2,
    // border: "1px solid #eaeaea",
    // marginBottom: 8,
    // marginRight: 8,
    // width: 100,
    // height: 100,
    // padding: 4,
    // boxSizing: "border-box",
  };

  const thumbInner = {
    minWidth: 0,
    overflow: "hidden",
    Position: "relative",
  };

  const img = {
    display: "block",
    width: "auto",
    height: "100%",
  };

  const {
    getRootProps: getRootfileProps,
    getInputProps: getInputfileProps,
    isDragActive,
    acceptedFiles,
    isFocused,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    accept: {
      "text/csv": [],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [],
    },
    onDrop: useCallback(
      (acceptedFiles) => {
        setFiles([
          ...files,
          ...acceptedFiles.map((file) =>
            Object.assign(file, {
              preview: URL.createObjectURL(file),
              title: file.name,
            })
          ),
        ]);
      },
      [files]
    ),
  });

  const style = useMemo(
    () => ({
      ...baseStyle,
      ...(isFocused ? focusedStyle : {}),
    }),
    [isFocused, isDragAccept, isDragReject]
  );
  const removeFile = (file) => () => {
    const newFiles = [...files];
    newFiles.splice(newFiles.indexOf(file), 1);
    setFiles(newFiles);
  };

  const thumbs = files.map((file) => (
    <div style={thumb} key={file.name}>
      <div style={thumbInner}>
        <div className="remveImageDivShow">
          File Selected : {file.name}
          <div onClick={removeFile(file)}>
            <span className="crossicon12">
              <i
                class="fa fa-trash-o"
                style={{ fontSize: "12px", color: "red" }}
              ></i>
            </span>
          </div>
        </div>
      </div>
    </div>
  ));

  const handleCloseUpload = () => {
    setopenUploadFile(false);
    setFiles([]);
  };
  const handleClickOpenUpload = () => {
    setopenUploadFile(true);
  };

  const handleFileSubmit = () => {
    setIsLoading(true);
    const formData = new FormData();
    if (files.length > 0) {
      for (const key of Object.keys(files)) {
        formData.append("csv_file", files[key]);
      }
    } else {
      formData.append("csv_file", "");
    }

    dispatch(UploadFileAction(formData));
    setRerender(true);
  };

  useEffect(() => {
    if (success && rerender) {
      swal({
        title: "SaaSot App",
        text: "Successfully Uploade",
        className: "successAlert",
        icon: "https://flowbite.com/docs/images/logo.svg",
        buttons: false,
        timer: 3000,
        open: true,
      });
      setRerender(false);
      setopenUploadFile(false);
      setFiles([]);
      setIsLoading(false);
    }
    if (error && rerender) {
      swal({
        title: "Error",
        text: error?.message,
        className: "errorAlert",
        icon: "https://flowbite.com/docs/images/logo.svg",
        buttons: false,
        timer: 3000,
      });
      setRerender(false);
      setIsLoading(false);
    }
  }, [dispatch, success, error]);

  const handleDownload = () => {
    const fileUrl = process.env.PUBLIC_URL + "/sampleFiles.xlsx"; // Replace with the path to your XLSX file in the public folder
    saveAs(fileUrl, "sampleFiles.xlsx");
  };

  return (
    <>
     {isLoading ? (
        <LoadingSpinner />
      ) : (
      <div className="content">
            <div className="card uploadebtn">
              
              <div className="upload-page">
                <div className="UploadeFilesSection">Uploade Files</div>
                <Link to="/contract-upload">
                  <button class="button-text-t uploadfilessubmitbutton UploadeFilesSectionView">
                    View Contract
                  </button>
                </Link>
                </div>
            
                <div className="container-upload">
                  <div
                    className="borderOfUploadFilenew"
                    {...getRootfileProps({ style })}
                  >
                    <input
                      {...getInputfileProps()}
                      // imgExtension={[".jpg", ".gif", ".png", ".gif", ".mp4"]}
                      // maxfilesize={5242880}
                    />
                    <span className="uploadFilenewArea">
                      <img
                        className="upiconimg"
                        src="/img/uploadimg.png"
                        alt=""
                      />
                      Upload Files
                    </span>
                  </div>
                  <aside style={thumbsContainer}>{thumbs}</aside>
                </div>
                <div className="uploadediv">
                <div className="uploadfilessubmitbtndownloadMain">
                  <button
                    class="uploadfilessubmitbtndownload"
                    onClick={handleDownload}
                  >
                    Download sample file
                  </button>
                </div>
                <div className="cancelButtonnewFolder submitbtn">
                 
                  <button
                    class="button-text-t uploadfilessubmitbtn"
                    onClick={handleFileSubmit}
                  >
                    Submit
                  </button>
                </div>
                </div>
                {UploadFile && (
                  <div className="show-startDatemain shadow-container">
                    <div className="show-startDatemainChild">
                      <h1 className="startDateheading">
                        {UploadFile?.undefiend_service?.message}
                      </h1>
                      <span className="invoiceheading">Invoice No.</span>
                      <div className="showtheDatamap">
                        {UploadFile?.undefiend_service?.correct_csv_date?.map(
                          (item) => (
                            <p className="startDateContent">{item} ,</p>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}
            </div>
      </div>
      )}
    </>
  );
};

export default UploadeFiles;
