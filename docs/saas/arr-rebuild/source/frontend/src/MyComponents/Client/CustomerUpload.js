import React from 'react'
import { Card, CardHeader, CardBody, Row, Col, Button } from "reactstrap";

const CustomerUpload = () => {
  return (
   <>
    <div className="content">
        <Row>
          <Col md="12">
            <Card className="card uploadebtn">
              {/* <CardHeader>
                <button
                  class="bg-teal-800 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded uploadfilessubmitbtn"
                  onClick={handleClickOpenUpload}
                >
                  Add Products/Services 
                </button>
              </CardHeader> */}
              <CardBody>
                <div className="container">
                <div className='comingtitle'>CustomerUpload page  is coming soon</div>
                  {/* <MDBDataTable
                    className="dashbordtable dashbordtable1"
                    style={{}}
                    responsive
                    striped
                    bordered
                    small
                    data={data1}
                  /> */}
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
   
   </>
  )
}

export default CustomerUpload