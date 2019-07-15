export class InvalidEntityKeyError extends Error {
  constructor(context, props) {
    super(
      'Invalid entity key\uff0c( model = ' +
        context +
        ", key = '" +
        JSON.stringify(props) +
        "' ) "
    );
  }
}
