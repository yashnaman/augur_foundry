import React, { PureComponent } from 'react';

import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';
import Form from 'react-bootstrap/Form';
import Col from 'react-bootstrap/Col';
import Jumbotron from 'react-bootstrap/Jumbotron';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import metaMaskStore from './components/metaMask'

import markets from './markets.json'
import erc20 from './configs/abi/erc20.json'
import { daiAddress } from './configs/address'

export default class App extends PureComponent {

  constructor(props){
    super(props);
    this.mintDaiForm = this.mintDaiForm.bind(this);
    this.state = {
      web3Provider: {
          web3: null,
          metaMaskInstalled: false,
          isLogin: false,
          netWorkId: 0,
          accounts: []
      },
      daiInstance:null
    }
  }

  componentWillMount() {
    metaMaskStore.checkWeb3(true);
    metaMaskStore.on("META_MASK_CONNECTED", this.metaMaskConnected.bind(this));
    metaMaskStore.on("META_MASK_ADDRESS_CHANGED", this.metaAddressChange.bind(this));
    metaMaskStore.on("META_MASK_NETWORK_CHANGED", this.metaNetwrokChange.bind(this));
   
   
  }
  componentWillUnmount() {
      metaMaskStore.removeListener("META_MASK_CONNECTED", this.metaMaskConnected.bind(this));
      metaMaskStore.removeListener("META_MASK_ADDRESS_CHANGED", this.metaAddressChange.bind(this));
      metaMaskStore.removeListener("META_MASK_NETWORK_CHANGED", this.metaNetwrokChange.bind(this));
  }
    metaMaskConnected() {
      this.setState({ web3Provider: metaMaskStore.getWeb3()},()=>{
        this.initData()
      });
    }

    metaAddressChange() {
      this.setState({ web3Provider: metaMaskStore.getWeb3()},()=>{
        this.initData()
      });
    }

    metaNetwrokChange() {
      this.setState({ web3Provider: metaMaskStore.getWeb3() },()=>{
        this.initData()
      });
    }

    initData(){
      const {web3} = this.state.web3Provider;
      const daiInstance = new web3.eth.Contract(
        erc20,
        daiAddress
      );
      console.log(daiInstance)
      this.setState({daiInstance:daiInstance})
    }

    getBalance(address){

      return 100;
    }

    async mintDaiForm(e){
      e.preventDefault();
      const {web3,accounts} = this.state.web3Provider;
      const {daiInstance} = this.state;
      const marketIds = e.target.elements.marketIds.value;
      const amount = e.target.elements.amount.value;
      const weiAmount = web3.utils.toWei(amount);
      const daiBalance = await daiInstance.methods.balanceOf(accounts[0]).call();

        // daiInstance.methods
        //   .swapWithOldToken(a)
        //   .send({
        //     from: address[0],
        //     value: 0,
        // }).on('transactionHash', (hash) => {
            
        // }).on('receipt', (receipt) => {
            
        // }).on("error", (error) => {
            
        // })
      
    }

    wrapShare(address){
      alert(address);
    }

    checkDaiContion(address){

      return true;
    }

  render() {
      return (
        <Container className="p-3 mainContainer">
          <Jumbotron>
            <h3 className="header"><span style={{color:"#FFA300"}}>AU</span>GUR <br></br> FOUNDRY</h3>
              <Row>
                  <Col xs={7}>
                    <Jumbotron className="dropdownMarket" >
                    <Form onSubmit={this.mintDaiForm} >
                        <Form.Group controlId="exampleForm.SelectCustom" >
                          <Form.Control as="select" custom name="marketIds">
                          <option value={0}>Select Market</option>
                          {markets.map(i => (
                            <option value={i.address} key={i.address}>{i.extraInfo.description}</option>
                          ))}
                          </Form.Control>
                        </Form.Group> 
                    
                    <Row>
                      <Col xs={8}>
                        <Form.Group controlId="exampleForm.ControlInput1">
                          <Form.Control type="text"  name="amount" placeholder="ENTER AMOUNT OF DAI" />
                        </Form.Group>
                      </Col>
                      <Col xs={4}>
                        <Button variant="primary" type="submit" block className="mintShare">
                            MINT SHARES
                        </Button>
                      </Col>
                    </Row> 
                    </Form>
                    </Jumbotron>
                  </Col>
                </Row>

                <h3 className="header">MY INVETORY</h3>
                <Table striped bordered hover>
                  <thead>
                      <tr>
                        <th>Market</th>
                        <th>Holding</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                        {markets.map(i => (
                          <tr>
                            <td>
                              {i.extraInfo.description}
                            </td>
                            <td>
                              Yes : {this.getBalance(i.address)}
                              <br/>
                              No  : {this.getBalance(i.address)}
                            </td>
                            <td>
                            {this.checkDaiContion(i.address)?
                              <span>
                                <Button variant="danger" type="submit" onClick={(e)=>this.wrapShare(i.address)}>
                                  WRAP SHARES
                                </Button>
                                
                                <Button variant="secondary" className="m-left" type="submit">
                                  REDEEM DAI
                                </Button>
                              </span>
                               :
                                <Button variant="success" type="submit">
                                  UNWRAP
                                </Button> 
                                }

                            </td>
                          </tr>
                        ))}
                    </tbody>
                  
                
                </Table>
             
          </Jumbotron>
          
            
          
        </Container>
      );
  }
}


