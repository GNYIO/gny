import { MigrationInterface } from 'typeorm';
import { QueryRunner } from 'typeorm';

export class InitMigration1605362544330 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
      CREATE TABLE public.account (
        address character varying(50) NOT NULL,
        username character varying(30),
        gny bigint DEFAULT '0'::bigint NOT NULL,
        "publicKey" character varying(64),
        "secondPublicKey" character varying(64),
        "isDelegate" integer DEFAULT 0 NOT NULL,
        "isLocked" integer DEFAULT 0 NOT NULL,
        "lockHeight" bigint DEFAULT '0'::bigint NOT NULL,
        "lockAmount" bigint DEFAULT '0'::bigint NOT NULL,
        _version_ integer DEFAULT 0 NOT NULL
      );

      ALTER TABLE public.account OWNER TO postgres;

      CREATE TABLE public.asset (
        name character varying(50) NOT NULL,
        tid character varying(64) NOT NULL,
        "timestamp" integer NOT NULL,
        maximum bigint NOT NULL,
        "precision" integer NOT NULL,
        quantity bigint NOT NULL,
        "desc" text NOT NULL,
        "issuerId" character varying(50) NOT NULL,
        _version_ integer DEFAULT 0 NOT NULL
      );


      ALTER TABLE public.asset OWNER TO postgres;

      --
      -- Name: balance; Type: TABLE; Schema: public; Owner: postgres
      --

      CREATE TABLE public.balance (
        address character varying(64) NOT NULL,
        currency character varying(30) NOT NULL,
        balance bigint NOT NULL,
        flag integer NOT NULL,
        _version_ integer DEFAULT 0 NOT NULL
      );


      ALTER TABLE public.balance OWNER TO postgres;

      --
      -- Name: block; Type: TABLE; Schema: public; Owner: postgres
      --

      CREATE TABLE public.block (
        id character varying(64) NOT NULL,
        version integer NOT NULL,
        "timestamp" integer NOT NULL,
        height bigint NOT NULL,
        "prevBlockId" character varying(64),
        count integer NOT NULL,
        fees bigint NOT NULL,
        reward bigint NOT NULL,
        "payloadHash" character varying(64) NOT NULL,
        delegate character varying(64) NOT NULL,
        signature character varying(128) NOT NULL,
        _version_ integer DEFAULT 0 NOT NULL
      );


      ALTER TABLE public.block OWNER TO postgres;

      --
      -- Name: block_history; Type: TABLE; Schema: public; Owner: postgres
      --

      CREATE TABLE public.block_history (
        height bigint NOT NULL,
        history character varying NOT NULL,
        _version_ integer DEFAULT 0 NOT NULL
      );


      ALTER TABLE public.block_history OWNER TO postgres;

      --
      -- Name: delegate; Type: TABLE; Schema: public; Owner: postgres
      --

      CREATE TABLE public.delegate (
        address character varying(50) NOT NULL,
        tid character varying(64) NOT NULL,
        username character varying(50) NOT NULL,
        "publicKey" character varying(64) NOT NULL,
        votes bigint,
        "producedBlocks" bigint,
        "missedBlocks" bigint,
        fees bigint,
        rewards bigint,
        _version_ integer DEFAULT 0 NOT NULL
      );


      ALTER TABLE public.delegate OWNER TO postgres;

      --
      -- Name: info; Type: TABLE; Schema: public; Owner: postgres
      --

      CREATE TABLE public.info (
        key character varying(256) NOT NULL,
        value text NOT NULL,
        _version_ integer DEFAULT 0 NOT NULL
      );


      ALTER TABLE public.info OWNER TO postgres;

      --
      -- Name: issuer; Type: TABLE; Schema: public; Owner: postgres
      --

      CREATE TABLE public.issuer (
        name character varying(32) NOT NULL,
        tid character varying(64) NOT NULL,
        "issuerId" character varying(50) NOT NULL,
        "desc" character varying(4096) NOT NULL,
        _version_ integer DEFAULT 0 NOT NULL
      );


      ALTER TABLE public.issuer OWNER TO postgres;

      --
      -- Name: mldata; Type: TABLE; Schema: public; Owner: postgres
      --

      CREATE TABLE public.mldata (
        address character varying(50) NOT NULL,
        id bigint NOT NULL,
        "ProductName" character varying(32) NOT NULL,
        "CustomerName" character varying(64) NOT NULL,
        "PurchaseAmount" bigint DEFAULT '0'::bigint NOT NULL,
        "ProductCategory" character varying(64) NOT NULL,
        "ProductSubCategory1" character varying(64) NOT NULL,
        "ProductSubCategory2" character varying(64) NOT NULL,
        "PurchaseLocationStreet" character varying(64) NOT NULL,
        "PurchaseLocationCity" character varying(64) NOT NULL,
        "PurchaseLocationState" character varying(64) NOT NULL,
        "PurchaseLocationZipcode" character varying(64) NOT NULL,
        "PurchaseDate" date NOT NULL,
        _version_ integer DEFAULT 0 NOT NULL
      );


      ALTER TABLE public.mldata OWNER TO postgres;

      --
      -- Name: prediction; Type: TABLE; Schema: public; Owner: postgres
      --

      CREATE TABLE public.prediction (
        address character varying(64) NOT NULL,
        prediction character varying(1024) NOT NULL,
        _version_ integer DEFAULT 0 NOT NULL
      );


      ALTER TABLE public.prediction OWNER TO postgres;

      --
      -- Name: round; Type: TABLE; Schema: public; Owner: postgres
      --

      CREATE TABLE public.round (
        round bigint NOT NULL,
        fee bigint DEFAULT '0'::bigint,
        reward bigint DEFAULT '0'::bigint,
        _version_ integer DEFAULT 0 NOT NULL
      );


      ALTER TABLE public.round OWNER TO postgres;

      --
      -- Name: transaction; Type: TABLE; Schema: public; Owner: postgres
      --

      CREATE TABLE public.transaction (
        id character varying(64) NOT NULL,
        type integer NOT NULL,
        "timestamp" integer NOT NULL,
        "senderId" character varying(50) NOT NULL,
        "senderPublicKey" character varying(64) NOT NULL,
        fee bigint NOT NULL,
        signatures character varying(164) NOT NULL,
        "secondSignature" character varying(128),
        args character varying,
        height bigint NOT NULL,
        message character varying(256),
        _version_ integer DEFAULT 0 NOT NULL
      );


      ALTER TABLE public.transaction OWNER TO postgres;

      --
      -- Name: transfer; Type: TABLE; Schema: public; Owner: postgres
      --

      CREATE TABLE public.transfer (
        tid character varying(64) NOT NULL,
        "senderId" character varying(50) NOT NULL,
        "recipientId" character varying(50) NOT NULL,
        "recipientName" character varying(30),
        currency character varying(30) NOT NULL,
        amount bigint NOT NULL,
        "timestamp" integer NOT NULL,
        height bigint NOT NULL,
        _version_ integer DEFAULT 0 NOT NULL
      );


      ALTER TABLE public.transfer OWNER TO postgres;

      --
      -- Name: variable; Type: TABLE; Schema: public; Owner: postgres
      --

      CREATE TABLE public.variable (
        key character varying(256) NOT NULL,
        value text NOT NULL,
        _version_ integer DEFAULT 0 NOT NULL
      );


      ALTER TABLE public.variable OWNER TO postgres;

      --
      -- Name: vote; Type: TABLE; Schema: public; Owner: postgres
      --

      CREATE TABLE public.vote (
        "voterAddress" character varying(50) NOT NULL,
        delegate character varying(50) NOT NULL,
        _version_ integer DEFAULT 0 NOT NULL
      );


      ALTER TABLE public.vote OWNER TO postgres;



      ALTER TABLE ONLY public.asset
      ADD CONSTRAINT "asset_name_pkey" PRIMARY KEY (name);


      --
      -- Name: transfer transfer_tid_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.transfer
          ADD CONSTRAINT "transfer_tid_pkey" PRIMARY KEY (tid);


      --
      -- Name: variable variable_key_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.variable
          ADD CONSTRAINT "variable_key_pkey" PRIMARY KEY (key);


      --
      -- Name: issuer issuer_name_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.issuer
          ADD CONSTRAINT "issuer_name_pkey" PRIMARY KEY (name);


      --
      -- Name: prediction prediction_address_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.prediction
          ADD CONSTRAINT "prediction_address_pkey" PRIMARY KEY (address);


      --
      -- Name: round round_round_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.round
          ADD CONSTRAINT "round_round_pkey" PRIMARY KEY (round);


      --
      -- Name: info info_key_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.info
          ADD CONSTRAINT "info_key_pkey" PRIMARY KEY (key);


      --
      -- Name: block_history PK_7cc0c3368bffdbd512ad86d161a; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.block_history
          ADD CONSTRAINT "block_history_height_pkey" PRIMARY KEY (height);


      --
      -- Name: account account_address_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.account
          ADD CONSTRAINT "account_address_pkey" PRIMARY KEY (address);


      --
      -- Name: mldata mldata_address_id_ProductName_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.mldata
          ADD CONSTRAINT "mldata_address_id_ProductName_pkey" PRIMARY KEY (address, id, "ProductName");


      --
      -- Name: transaction transaction_id_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.transaction
          ADD CONSTRAINT "transaction_id_pkey" PRIMARY KEY (id);


      --
      -- Name: balance balance_address_currency_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.balance
          ADD CONSTRAINT "balance_address_currency_pkey" PRIMARY KEY (address, currency);


      --
      -- Name: block block_id_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.block
          ADD CONSTRAINT "block_id_pkey" PRIMARY KEY (id);


      --
      -- Name: delegate delegate_address_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.delegate
          ADD CONSTRAINT "delegate_address_pkey" PRIMARY KEY (address);


      --
      -- Name: vote vote_voterAddress_delegate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.vote
          ADD CONSTRAINT "vote_voterAddress_delegate_pkey" PRIMARY KEY ("voterAddress", delegate);


      --
      -- Name: delegate delegate_publicKey_key; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.delegate
          ADD CONSTRAINT "delegate_publicKey_key" UNIQUE ("publicKey");


      --
      -- Name: issuer issuer_tid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.issuer
          ADD CONSTRAINT "issuer_tid_key" UNIQUE (tid);


      --
      -- Name: asset asset_tid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.asset
          ADD CONSTRAINT "asset_tid_key" UNIQUE (tid);


      --
      -- Name: account account_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.account
          ADD CONSTRAINT "account_username_key" UNIQUE (username);


      --
      -- Name: delegate delegate_tid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.delegate
          ADD CONSTRAINT "delegate_tid_key" UNIQUE (tid);


      --
      -- Name: delegate delegate_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.delegate
          ADD CONSTRAINT "delegate_username_key" UNIQUE (username);


      --
      -- Name: block block_height_key; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.block
          ADD CONSTRAINT "block_height_key" UNIQUE (height);


      --
      -- Name: issuer issuer_issuerId_key; Type: CONSTRAINT; Schema: public; Owner: postgres
      --
      ALTER TABLE ONLY public.issuer
          ADD CONSTRAINT "issuer_issuerId_key" UNIQUE ("issuerId");


      --
      -- Name: transfer_height_idx; Type: INDEX; Schema: public; Owner: postgres
      --
      CREATE INDEX "transfer_height_idx" ON public.transfer USING btree (height);


      --
      -- Name: prediction_prediction_idx; Type: INDEX; Schema: public; Owner: postgres
      --
      CREATE INDEX "prediction_prediction_idx" ON public.prediction USING btree (prediction);


      --
      -- Name: prediction_address_idx; Type: INDEX; Schema: public; Owner: postgres
      --
      CREATE INDEX "prediction_address_idx" ON public.prediction USING btree (address);


      --
      -- Name: block_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
      --
      CREATE INDEX "block_timestamp_idx" ON public.block USING btree ("timestamp");


      --
      -- Name: balance_address_idx; Type: INDEX; Schema: public; Owner: postgres
      --
      CREATE INDEX "balance_address_idx" ON public.balance USING btree (address);


      --
      -- Name: transfer_recipientId_idx; Type: INDEX; Schema: public; Owner: postgres
      --
      CREATE INDEX "transfer_recipientId_idx" ON public.transfer USING btree ("recipientId");


      --
      -- Name: transfer_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
      --
      CREATE INDEX "transfer_timestamp_idx" ON public.transfer USING btree ("timestamp");


      --
      -- Name: transfer_senderId_idx; Type: INDEX; Schema: public; Owner: postgres
      --

      CREATE INDEX "transfer_senderId_idx" ON public.transfer USING btree ("senderId");


      --
      -- Name: transaction_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
      --
      CREATE INDEX "transaction_timestamp_idx" ON public.transaction USING btree ("timestamp");


      --
      -- Name: transfer_currency_idx; Type: INDEX; Schema: public; Owner: postgres
      --
      CREATE INDEX "transfer_currency_idx" ON public.transfer USING btree (currency);


      --
      -- Name: asset_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
      --
      CREATE INDEX "asset_timestamp_idx" ON public.asset USING btree ("timestamp");


      --
      -- Name: asset_maximum_idx; Type: INDEX; Schema: public; Owner: postgres
      --
      CREATE INDEX "asset_maximum_idx" ON public.asset USING btree (maximum);


      --
      -- Name: balance_currency_idx; Type: INDEX; Schema: public; Owner: postgres
      --
      CREATE INDEX "balance_currency_idx" ON public.balance USING btree (currency);


      --
      -- Name: balance_flag_idx; Type: INDEX; Schema: public; Owner: postgres
      --
      CREATE INDEX "balance_flag_idx" ON public.balance USING btree (flag);


      --
      -- Name: transaction_type_idx; Type: INDEX; Schema: public; Owner: postgres
      --
      CREATE INDEX "transaction_type_idx" ON public.transaction USING btree (type);


      --
      -- Name: delegate_votes_idx; Type: INDEX; Schema: public; Owner: postgres
      --
      CREATE INDEX "delegate_votes_idx" ON public.delegate USING btree (votes);


      --
      -- Name: block_prevBlockId_idx; Type: INDEX; Schema: public; Owner: postgres
      --
      CREATE INDEX "block_prevBlockId_idx" ON public.block USING btree ("prevBlockId");


      --
      -- Name: transaction_message_idx; Type: INDEX; Schema: public; Owner: postgres
      --
      CREATE INDEX "transaction_message_idx" ON public.transaction USING btree (message);


      --
      -- Name: transaction_senderId_idx; Type: INDEX; Schema: public; Owner: postgres
      --
      CREATE INDEX "transaction_senderId_idx" ON public.transaction USING btree ("senderId");
    `);
  }
  async down(queryRunner: QueryRunner): Promise<any> {}
}

export class DeleteInfoTable1608475266157 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP TABLE info`);

    await queryRunner.query(`
      update block_history p
      set history = (
        select jsonb_agg(value)
        from block_history ps,
        jsonb_array_elements(history::jsonb)
        where ps.height = p.height      -- important! primary key to identify a row
        and value->>'model' <> 'Info')::varchar
      returning *;
    `);
  }
  async down(queryRunner: QueryRunner): Promise<any> {}
}

export class AddBurnTable1691572220932 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
      CREATE TABLE public.burn (
        tid character varying(64) NOT NULL,
        "senderId" character varying(50) NOT NULL,
        amount bigint NOT NULL,
        height bigint NOT NULL,
        _version_ integer DEFAULT 0 NOT NULL
      );

      ALTER TABLE public.burn OWNER TO postgres;
    `);
  }
  async down(queryRunner: QueryRunner): Promise<any> {}
}
