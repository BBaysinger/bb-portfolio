/**
 * Sometimes things come up like live porfolio peices breaking. This a component to
 * call things out in a pinch.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export default class TempMessage {

  /**
   *
   *
   * @static
   * @returns
   * @memberof TempMessage
   */
  static message() {
    const headerStyle = {
      marginTop: "10px",
      color: "#ff6522",
    };

    return (
      <div>
        <div className="jumbotron">
          <h4 style={headerStyle}>Attention:</h4>
          <p></p>
        </div>
      </div>
    );
  }
}
