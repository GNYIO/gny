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
        "timestamp" integer NOT NULL,
        height bigint NOT NULL,
        _version_ integer DEFAULT 0 NOT NULL
      );

      ALTER TABLE public.burn OWNER TO postgres;

      ALTER TABLE ONLY public.burn
        ADD CONSTRAINT "burn_tid_pkey" PRIMARY KEY (tid);

      CREATE INDEX "burn_senderId_idx" ON public.burn USING btree ("senderId");
      CREATE INDEX "burn_timestamp_idx" ON public.burn USING btree ("timestamp");
      CREATE INDEX "burn_height_idx" ON public.burn USING btree (height);
    `);
  }
  async down(queryRunner: QueryRunner): Promise<any> {}
}

// was moved before CreateDat* migration
export class AddBlockDelegateIndex1694943715000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
      CREATE INDEX "block_delegate_idx" ON public.block USING btree ("delegate");
    `);
  }
  async down(queryRunner: QueryRunner): Promise<any> {}
}

export class CreateDat1700423861000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
      CREATE TABLE public.dat_maker (
        name character varying(30) NOT NULL,
        "desc" character varying(100) NOT NULL,
        "address" character varying(50) NOT NULL,
        tid character varying(64) NOT NULL,
        "datCounter" bigint NOT NULL,
        _version_ integer DEFAULT 0 NOT NULL
      );

      ALTER TABLE public.dat_maker OWNER TO postgres;

      ALTER TABLE ONLY public.dat_maker
          ADD CONSTRAINT "dat_maker_name_pkey" PRIMARY KEY (name);

      ALTER TABLE ONLY public.dat_maker
          ADD CONSTRAINT "dat_maker_tid_key" UNIQUE (tid);





      CREATE TABLE public.dat (
        name character varying(40) NOT NULL,
        hash character varying(64) NOT NULL,
        "previousHash" character varying(64) NULL,
        tid character varying(64) NOT NULL,
        "counter" bigint NOT NULL,
        "datMakerId" character varying(30) NOT NULL,
        "ownerAddress" character varying(50) NOT NULL,
        "timestamp" integer NOT NULL,
        "url" varchar(255) NOT NULL,
        _version_ integer DEFAULT 0 NOT NULL
      );

      ALTER TABLE public.dat OWNER TO postgres;

      ALTER TABLE ONLY public.dat
          ADD CONSTRAINT "dat_name_pkey" PRIMARY KEY (name);
      ALTER TABLE ONLY public.dat
          ADD CONSTRAINT "dat_hash_key" UNIQUE (hash);
      ALTER TABLE ONLY public.dat
          ADD CONSTRAINT "dat_tid_key" UNIQUE (tid);
      CREATE INDEX "dat_counter_idx"
          ON public.dat USING btree (counter);
      CREATE INDEX "dat_datMakerId_idx"
          ON public.dat USING btree ("datMakerId");
      CREATE INDEX "dat_ownerAddress_idx"
          ON public.dat USING btree ("ownerAddress");
      CREATE INDEX "dat_timestamp_idx"
          ON public.dat USING btree ("timestamp");
      CREATE INDEX "dat_url_idx"
          ON public.dat USING btree ("url");
    `);
  }
  async down(queryRunner: QueryRunner): Promise<any> {}
}

export class AddEligibleColumnToDelegate1701104571000
  implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<any> {
    // add eligible column
    await queryRunner.query(`
      ALTER TABLE public."delegate" ADD COLUMN eligible integer DEFAULT 0 NOT NULL;
    `);

    // set eligible column to 1 for every account that has
    // at least 187,500 GNY locked
    await queryRunner.query(`
        UPDATE public."delegate" d
        SET eligible = 1
        FROM public."account" a
        WHERE a.address = d.address
          AND a."lockAmount" >= 18750000000000;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<any> {}
}

export class Verification1712752540000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
      CREATE TABLE public.verification (
        identifier character varying(128) NOT NULL,
        tid character varying(64) NOT NULL,
        "senderId" character varying(50) NOT NULL,
        signature character varying(128) NOT NULL,
        "timestamp" integer NOT NULL,
        height bigint NOT NULL,
        _version_ integer DEFAULT 0 NOT NULL
      );

      ALTER TABLE public.verification OWNER TO postgres;

      ALTER TABLE ONLY public.verification
          ADD CONSTRAINT "verification_identifier_pkey" PRIMARY KEY (identifier);

      CREATE INDEX "verification_tid_idx"
          ON public.verification USING btree (tid);
      CREATE INDEX "verification_senderId_idx"
          ON public.verification USING btree ("senderId");
      CREATE INDEX "verification_timestamp_idx"
          ON public.verification USING btree (timestamp);
      CREATE INDEX "verification_height_idx"
          ON public.verification USING btree (height);
    `);
  }
  async down(queryRunner: QueryRunner): Promise<any> {}
}

export class AugmentDATs1715108311000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<any> {
    // https://stackoverflow.com/questions/512451/how-can-i-add-a-column-that-doesnt-allow-nulls-in-a-postgresql-database
    await queryRunner.query(`

      /* add column height to public.dat_maker table */
      ALTER TABLE public.dat_maker ADD COLUMN height bigint NOT NULL DEFAULT '-1'::bigint;

      /* update newly created height column on public.dat_maker table */
      UPDATE public.dat_maker d
      SET height = t.height
      FROM public.transaction t
        WHERE t.id = d.tid;

      /* every row has a value, now drop default */
      ALTER TABLE public.dat_maker ALTER COLUMN height DROP DEFAULT;





      ALTER TABLE public.dat ADD COLUMN height bigint NOT NULL DEFAULT '-1'::bigint;
      UPDATE public.dat d
      SET height = t.height
      FROM public.transaction t
        WHERE t.id = d.tid;
      ALTER TABLE public.dat ALTER COLUMN height DROP DEFAULT;





      ALTER TABLE public.dat_maker ADD COLUMN timestamp integer NOT NULL DEFAULT -2::int;
      UPDATE public.dat_maker d
      SET timestamp = t.timestamp
      FROM public.transaction t
        WHERE t.id = d.tid;
      ALTER TABLE public.dat_maker ALTER COLUMN timestamp DROP DEFAULT;

      CREATE INDEX "dat_maker_height_idx" ON public.dat_maker USING btree (height);
      CREATE INDEX "dat_height_idx" ON public.dat USING btree (height);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<any> {}
}

export class AugmentDATsAgain1715108311000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<any> {
    // falsely changed the column length in a a old migration
    // this doesn't work
    // one has to always create new migrations to change something
    await queryRunner.query(`
      /* increase length of public.dat.name column */
      ALTER TABLE public.dat ALTER name TYPE character varying(71);

      UPDATE public.dat
      SET name = CONCAT("datMakerId", '.', name);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<any> {}
}

export class MoreIndexes1739732168000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<any> {
    // change block_delegate_idx index by recreating it with different columns
    await queryRunner.query(`
      DROP INDEX block_delegate_idx;

      CREATE INDEX block_delegate_idx ON public.block USING btree (delegate asc, height asc);
    `);

    // add extra index for dat_maker (because API is filtering with address)
    await queryRunner.query(`
      CREATE INDEX dat_maker_address_idx ON public.dat_maker USING btree (address);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<any> {}
}

export class TransactionPlacement1740078090000 implements MigrationInterface {
  // transaction = false;

  async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
      ALTER TABLE public.transaction
        ADD COLUMN placement integer NOT NULL
          DEFAULT 0
          CONSTRAINT transaction_placement_smaller_than_1000 CHECK(placement >= 0 AND placement <= 1000);
    `);

    // populate "placement" column
    await queryRunner.query(`
      update transaction t
      set placement = t2.seqnum -1
      from (
          select
            t2.*,
            row_number() over (
              PARTITION BY height
              ORDER BY timestamp ASC
            ) as seqnum

          from transaction t2
          ) t2
      where t2.id = t.id;
    `);

    // update genesis block
    await queryRunner.query(`

        -- localnet
        UPDATE public.transaction SET placement = 0 WHERE height = 0 AND id = '80f1de726dd81eb37b280e684a8ccfda2541ac4ec4b683318bd49b8cf06c404f';
        UPDATE public.transaction SET placement = 1 WHERE height = 0 AND id = '4bb3f1db616409c0fe5448adb1c0edf9161a69f1475f49c636f83047c94661e1';
        UPDATE public.transaction SET placement = 2 WHERE height = 0 AND id = '41173007be827801c37d7d38329ecbcd3dffbaa6960ae8ac183989dfd2a16a3b';
        UPDATE public.transaction SET placement = 3 WHERE height = 0 AND id = '0e3891f8c3ee93e48f5495e92513984c9ccfd8fb3cece52a87dedbd1957ba89f';
        UPDATE public.transaction SET placement = 4 WHERE height = 0 AND id = '907377b2a1527f0cb343982b7e4434ad57cd49a6a9f09d6e962321b7be239828';
        UPDATE public.transaction SET placement = 5 WHERE height = 0 AND id = '283deef39106242e67f323972fea339a71ff3e2e888513d9b2ea4685dc2dd8c3';
        UPDATE public.transaction SET placement = 6 WHERE height = 0 AND id = '60ba8360c2c5a72005642f4e5ac1c56c65b82315dc721fbe7c0f31a4133137f6';
        UPDATE public.transaction SET placement = 7 WHERE height = 0 AND id = '940a85d355c3674de99ff564b6c78f03df09ab90adbf2199df5ff47f54edda5b';
        UPDATE public.transaction SET placement = 8 WHERE height = 0 AND id = '9207922cb982505efe770176c41eb6cb3787ceb76d50fc4e2f3fa387373aa038';
        UPDATE public.transaction SET placement = 9 WHERE height = 0 AND id = 'ed876d60c754f513d6feafb4c4ccf4accd077b5b58ae30c29657ff3c9e55fb7e';
        UPDATE public.transaction SET placement = 10 WHERE height = 0 AND id = 'ab6706bba77efb1dbf4fe4a730f342d3c298ff9628e7fd026872e1a59eb6b714';
        UPDATE public.transaction SET placement = 11 WHERE height = 0 AND id = 'bcb79e8b1d46c772a200c0b67584b115cd5e60211d7e80779c02062929b2ec2c';
        UPDATE public.transaction SET placement = 12 WHERE height = 0 AND id = '2227486f61baf322c8995f675ac990ad67e6d921f323ea4b9f70697b5b508a34';
        UPDATE public.transaction SET placement = 13 WHERE height = 0 AND id = '5a692d47f02f6147882b658a995b1227d8ada989cf19614424906825e82aba7b';
        UPDATE public.transaction SET placement = 14 WHERE height = 0 AND id = '534e32b5d6ab6317cd2c4efcf942b33e5479e6cab9d0be15b2bca34642b06df1';
        UPDATE public.transaction SET placement = 15 WHERE height = 0 AND id = 'c5dd8bf89506bc4673b8362a94ce29f8dcc9e5b2a7963858345023cd6a106e4f';
        UPDATE public.transaction SET placement = 16 WHERE height = 0 AND id = '24b42ac057838cda8ed17ce967448097ad59eaad43dda49ed2992416ca9091f0';
        UPDATE public.transaction SET placement = 17 WHERE height = 0 AND id = '1ed75c43dbed4ae64ccdbefbe3ec9960e326aaa1988cea21cfc757b9b9d26426';
        UPDATE public.transaction SET placement = 18 WHERE height = 0 AND id = 'ac1008b7db85bd590a53cfcf3fc341da74b8a5c70c33c83f3a3c918d83d51a08';
        UPDATE public.transaction SET placement = 19 WHERE height = 0 AND id = '407d43f4e2a675bd7cb01e8d72d44ea06afae6466a41a3fe9f64b5f5fae55d92';
        UPDATE public.transaction SET placement = 20 WHERE height = 0 AND id = 'd041bfd1e39efbfb81659b507848fb6758503d61d379a87beb2138a58536bca2';
        UPDATE public.transaction SET placement = 21 WHERE height = 0 AND id = 'd31e413b0007916e9eacbbf07515886e6d3400755960fe0302be165ec40b4b45';
        UPDATE public.transaction SET placement = 22 WHERE height = 0 AND id = '50d4fef2095dde2d7a84b26334f4bc3cfd13afa4c2a89b82657d3c3c94180eb8';
        UPDATE public.transaction SET placement = 23 WHERE height = 0 AND id = '0f9f189d2b492ebd8fed05d4f63a41bf5fdbd4d5bd5196041bc37faf34d49109';
        UPDATE public.transaction SET placement = 24 WHERE height = 0 AND id = 'a7dea24ae5b34471a4af1a4b94112d264dfdb9acae270249e5218ba3a1cbfbe6';
        UPDATE public.transaction SET placement = 25 WHERE height = 0 AND id = 'ee359a5325040ba01a35bba4f0a71a846b29177b3e84fb952bb6181c7be55b66';
        UPDATE public.transaction SET placement = 26 WHERE height = 0 AND id = '8588f5deaf615e5c850b975d73b3d3686e0300640112b88edb21f02c53428597';
        UPDATE public.transaction SET placement = 27 WHERE height = 0 AND id = '79459610152177c4a09ae61ac5e381cfe0c1346023abafa3d525f922658aaa5e';
        UPDATE public.transaction SET placement = 28 WHERE height = 0 AND id = '18e2b2e6366e73fc5157876d8b3b5bb40ec51440b45a42969e97ed6d90b3670d';
        UPDATE public.transaction SET placement = 29 WHERE height = 0 AND id = 'fb868eedaf2a24daedeb3d1ab5f4ed0878fe9955d0239a2e3eb68db8de3e1492';
        UPDATE public.transaction SET placement = 30 WHERE height = 0 AND id = 'ef1252e509e9c8a5fdddf187f7e85d37323f0be31fb78b3bc3848f22d4021a2b';
        UPDATE public.transaction SET placement = 31 WHERE height = 0 AND id = 'b5d33627f0854feb1612e09e69a21530b2f55044241cb165f9e28a26b93872e4';
        UPDATE public.transaction SET placement = 32 WHERE height = 0 AND id = '6bd9de63e303d554d82223045b8f8c3ed56ce0838cab7bfd65d29a20ae9ffe75';
        UPDATE public.transaction SET placement = 33 WHERE height = 0 AND id = '1cb3c3cda3fcbc62f6fd8e2e3b6a660ac98fa5d3d39f32a86f80df211b69358f';
        UPDATE public.transaction SET placement = 34 WHERE height = 0 AND id = 'f83c2af705840a7f4e17f1ea1bf43586987d9e522a0af700321afcd1b294a006';
        UPDATE public.transaction SET placement = 35 WHERE height = 0 AND id = 'ec232b9c87e327639cb3d6b87a77634c4ce33e32c6a8e10a2c0619bb93ac3cb8';
        UPDATE public.transaction SET placement = 36 WHERE height = 0 AND id = 'f4e4ce8c1de22ddfe181041a7924ee8ce1a54386c28bf6cfcf92e7c92595a3fd';
        UPDATE public.transaction SET placement = 37 WHERE height = 0 AND id = 'c22cfd91dc9827ea219f9ab3b27963c7469f7d8234b4163138cfe935672ab7f0';
        UPDATE public.transaction SET placement = 38 WHERE height = 0 AND id = '67d46096de2a631747f7d3ebc43953a12221b00a05dd34d20a3a357d4f2e7bcc';
        UPDATE public.transaction SET placement = 39 WHERE height = 0 AND id = '756213a4113e63f1dfb4378a922f4f6562a31b805aa645ac58d5145af933eda3';
        UPDATE public.transaction SET placement = 40 WHERE height = 0 AND id = 'a7053cd1ffba81ab867ffc643aa87d89518948efc2d608a287656105bf791285';
        UPDATE public.transaction SET placement = 41 WHERE height = 0 AND id = '6eac5025faf3919694018e3b9d66f75aeab259a0ecf67f7fe50b8bf40166d5dc';
        UPDATE public.transaction SET placement = 42 WHERE height = 0 AND id = '84c4391a16fb0b6fb3ec7a4a30f5065960fc83e45c0fe079b4c10e37fe6cc9e6';
        UPDATE public.transaction SET placement = 43 WHERE height = 0 AND id = '79471845cfa1d9283cb8b91ddc03629ecf1a2e047bdbd88fd219cd0d1c698625';
        UPDATE public.transaction SET placement = 44 WHERE height = 0 AND id = 'a2c48a74beae4efa5d7f1d570955b93df7ad264fa94e363574e08ffd50cfa168';
        UPDATE public.transaction SET placement = 45 WHERE height = 0 AND id = '00edee9715c67dc19c18e64b1d90dd69988146c36f5fe27d0a91d85ff44950e2';
        UPDATE public.transaction SET placement = 46 WHERE height = 0 AND id = 'd9bc841f2982797451b03ed9d3965813ac1a0054fbbff56f76d6b4bc9b366fce';
        UPDATE public.transaction SET placement = 47 WHERE height = 0 AND id = 'ab3cbf10151d0d24fd67910d241f6848733ba42a2024115eeb00d84b2f74d61c';
        UPDATE public.transaction SET placement = 48 WHERE height = 0 AND id = '3eb0a739d03e8f1177d09f92806758bc40273543c114dc928b8a7f086f29bb2b';
        UPDATE public.transaction SET placement = 49 WHERE height = 0 AND id = '84a736a6d68290c3cf4fbcd3c023bdb06ab51d51e1d7d14974e480824b0e1cb4';
        UPDATE public.transaction SET placement = 50 WHERE height = 0 AND id = '415aefd09c9b9bfcceb18e3b8a88b33e66e4d550e72033c20e5baa6e099a806c';
        UPDATE public.transaction SET placement = 51 WHERE height = 0 AND id = '20b8ebba3b761cd588f615d93ee807dbe0458483327d9dca4017b1726e1c49bf';
        UPDATE public.transaction SET placement = 52 WHERE height = 0 AND id = '918e5287ccba10d58db7f01ad78c96edeeb3f48ad9cab512a6ac19335549b071';
        UPDATE public.transaction SET placement = 53 WHERE height = 0 AND id = 'e6ce3398f664de49a1d9bf920ad70e1b611de79cb130ff0f1c2d0ccc3c3099f0';
        UPDATE public.transaction SET placement = 54 WHERE height = 0 AND id = '0e211791bd928169d85474affee966b8261109aad516bf3e2c70abf826b06cfc';
        UPDATE public.transaction SET placement = 55 WHERE height = 0 AND id = '2f77ca53a27e5b7304b0c90c4051f3cd698d28f4d3339f5f72956c9275efcfbe';
        UPDATE public.transaction SET placement = 56 WHERE height = 0 AND id = '2f92ef3f9d7872d1d033b0cf94658e3d7c92092fec9eb291054d291131f9170d';
        UPDATE public.transaction SET placement = 57 WHERE height = 0 AND id = '61da7f57e02b0f689b7477bd2587dd380010229161cf750e705fe89bd433e8ee';
        UPDATE public.transaction SET placement = 58 WHERE height = 0 AND id = 'e63eaa5d6b5f3b9a961bfaf6cdddee14d01e8ad0c6aedc3f45cbaa1a1907be96';
        UPDATE public.transaction SET placement = 59 WHERE height = 0 AND id = '490b8ec2433ff28a677721e321644aac7588eed7c2e6416537decde3ba238963';
        UPDATE public.transaction SET placement = 60 WHERE height = 0 AND id = '2e94579e1be4c863eb87e6652216ec7eed7dd86e8f4badde9595189863972552';
        UPDATE public.transaction SET placement = 61 WHERE height = 0 AND id = '430c4bf451682466d8076a002d5f0221de8eb83d44d14fa9e9f0c3a306b4c89e';
        UPDATE public.transaction SET placement = 62 WHERE height = 0 AND id = 'c2bb3fc6d83d50ccf11b3d7e5121a9d9a76c37df9f1f971f4d7736c92b4e63f3';
        UPDATE public.transaction SET placement = 63 WHERE height = 0 AND id = '000f042a3165a41c66b5aea34e565faf1bbe54652813068a2486e3983eb9ead4';
        UPDATE public.transaction SET placement = 64 WHERE height = 0 AND id = 'e5a9f83fc66d2f35050c1385e290177610d01d3ddcf4c099321dcfc0243f4db7';
        UPDATE public.transaction SET placement = 65 WHERE height = 0 AND id = '39e166f00d014e57a0fd64b9d8eb7d9b0ee2e179cf64710444ad3ee472a776a2';
        UPDATE public.transaction SET placement = 66 WHERE height = 0 AND id = 'a063589ae8c57cb2f31061015d785bae27a139f44ae6298a70b352baa267b3e9';
        UPDATE public.transaction SET placement = 67 WHERE height = 0 AND id = '440f95d4dbb5891bd2033c3afb902f7302fb081f6dd88203e86699fdfc13971e';
        UPDATE public.transaction SET placement = 68 WHERE height = 0 AND id = 'c054f6db3cc48d96db75dda29a62ba0fa61d3341753a1a075b838fab480e649f';
        UPDATE public.transaction SET placement = 69 WHERE height = 0 AND id = '1bff1809c5ad2f9cf8288ee855fdd1bf709ba2e5fbb03b867742715e483e8fbf';
        UPDATE public.transaction SET placement = 70 WHERE height = 0 AND id = '125573406473a3028c483c727facd7c5169656e19a50803f73300987027a42a4';
        UPDATE public.transaction SET placement = 71 WHERE height = 0 AND id = 'f769f896aa4abe73fa2fb9bde2f75d41ed62e426fcf121d8db1fd9b786484624';
        UPDATE public.transaction SET placement = 72 WHERE height = 0 AND id = '8e15ecf6cdd4cc795034727662508ee9593212d7c977ccf66eaca547224cf899';
        UPDATE public.transaction SET placement = 73 WHERE height = 0 AND id = '2c1fa2c46f73046e9ecde973e63982a14f1aeb2003779d62423db42a03632e33';
        UPDATE public.transaction SET placement = 74 WHERE height = 0 AND id = 'd65537b4547f7a206e5eaee5b68e4aa994573a8250706ba695f1271330051be2';
        UPDATE public.transaction SET placement = 75 WHERE height = 0 AND id = '1a236292fae3d3d4bc7c871c70b6e3436b9bddd92b7ff9ba511a4010266e9edd';
        UPDATE public.transaction SET placement = 76 WHERE height = 0 AND id = 'c81b2a1dc8c085fe10b8a05a76507513cc1e75905d5a44b04cbf3badc0d0caf8';
        UPDATE public.transaction SET placement = 77 WHERE height = 0 AND id = 'a7f2bd2fbfcf6cde68e707eb37cecf0b062e53666089a6cdbad93ed9599bea05';
        UPDATE public.transaction SET placement = 78 WHERE height = 0 AND id = '0f6f1eea53f201445bd6b4d8053e3d57f1a985159ae681f985275ec4913b64b1';
        UPDATE public.transaction SET placement = 79 WHERE height = 0 AND id = '2bb5a894d8437d9af127c406e9548757209eb64c9ac56b9a347a3660c0806ae8';
        UPDATE public.transaction SET placement = 80 WHERE height = 0 AND id = '763e50d0002857724842bd50bb701a2df4c7b70ec4be8478632a43ab93123a48';
        UPDATE public.transaction SET placement = 81 WHERE height = 0 AND id = '5cca183511ab148bfbd9b38be3c551faffbd4c0477c53b5821991c2bb4dd36e1';
        UPDATE public.transaction SET placement = 82 WHERE height = 0 AND id = '0b0fcbe67534a259ec23be1c1e8713c65d1bbfe23172e77bb85cfe38e34c938c';
        UPDATE public.transaction SET placement = 83 WHERE height = 0 AND id = 'cafa3e2498a05a3f02a514a8375d57827395bf4e0b09e7baca213a86c1e67147';
        UPDATE public.transaction SET placement = 84 WHERE height = 0 AND id = '95ac91aab01262d79e2879f7e55e23bc5f2445c73c24ea9e5093bc65f99d88b5';
        UPDATE public.transaction SET placement = 85 WHERE height = 0 AND id = 'd05c77b8b2779079ea672092fa4d4a593c15e2dc64e17a90fa367397600e3738';
        UPDATE public.transaction SET placement = 86 WHERE height = 0 AND id = '999f4821d11e2e363d64fd885fe1667ffaec11895fbf35869fa166f1c035e404';
        UPDATE public.transaction SET placement = 87 WHERE height = 0 AND id = '18f101bed4e6f75a0e20bc8fc7894dbf5ada6c508401c75b6a327b702a76ce9d';
        UPDATE public.transaction SET placement = 88 WHERE height = 0 AND id = '60cebbc85147afe3b32f1209e7e22ee6f68b302229ef2fb0ea0b9044cd4a1c61';
        UPDATE public.transaction SET placement = 89 WHERE height = 0 AND id = '4eb90c42d2af8f0e10d4bf4669a28bfa0dd8efa50a7b719aeeed0cb72f33e81f';
        UPDATE public.transaction SET placement = 90 WHERE height = 0 AND id = 'de95ecfab1b1ff55c329c8348b843778c706d9743472fed1411c89d24e5e1bbc';
        UPDATE public.transaction SET placement = 91 WHERE height = 0 AND id = 'd70c30f1fb1803189a256cd433f6302e6f1e92cb127a3c5f28600b31c72a26f4';
        UPDATE public.transaction SET placement = 92 WHERE height = 0 AND id = 'cca083ec7a4b9cc40071e22000260ca0f509395d5bb7e647f8f17bcb32b3e67c';
        UPDATE public.transaction SET placement = 93 WHERE height = 0 AND id = 'f9dfaa2290ec8faa491a5b881458553aeb89b9ba85d24eb254c07b93989266b2';
        UPDATE public.transaction SET placement = 94 WHERE height = 0 AND id = '168f6cf924ea344784ec55995e4a3bcfc0b65ff47796e483d8c805dac4c20f9a';
        UPDATE public.transaction SET placement = 95 WHERE height = 0 AND id = '4796fd7ed5b5367ceb7d1379c26b2763cc7972fe8504860f8f9880a2d8e8e633';
        UPDATE public.transaction SET placement = 96 WHERE height = 0 AND id = 'c631a258687028814cd007a35c43d43c1d116757bed2a225467cfe0738f375e8';
        UPDATE public.transaction SET placement = 97 WHERE height = 0 AND id = '3e341379038b0cc31e072c69e353f2641f23b0f8d3821992eedf4700362dde33';
        UPDATE public.transaction SET placement = 98 WHERE height = 0 AND id = 'a4951dd23a883d39ba643ddaae219d61070a5d27f85588a2d0fb9394b9aabec8';
        UPDATE public.transaction SET placement = 99 WHERE height = 0 AND id = '903d6cc8faded93a5b9a5691c0c6b6ba15998be62256586f0a886dbb748ff5f5';
        UPDATE public.transaction SET placement = 100 WHERE height = 0 AND id = '6540269c163832e9573f490554c5695f60eb0daae66e9664a2dce0fc9d8d6720';
        UPDATE public.transaction SET placement = 101 WHERE height = 0 AND id = '37f504509c7afd8791420fc841e6a29a8e43dde1adc2ea841491ae0a4d61a661';
        UPDATE public.transaction SET placement = 102 WHERE height = 0 AND id = '3842c57a4a92647a32071ad12887735a1120f3f72989299c2a51ba85948bef3a';
        UPDATE public.transaction SET placement = 103 WHERE height = 0 AND id = '96a190e46cac3879c6aa890dde19f20c8ac4af5cfa08590a58ff5a6a3ad49b1b';
        UPDATE public.transaction SET placement = 104 WHERE height = 0 AND id = 'b5755c96962ceed17174b792bec0f36003064344932b23ec87628b7438320b3c';
        UPDATE public.transaction SET placement = 105 WHERE height = 0 AND id = 'f9f806d26e84a913a91250b6067093b2f68cf5b21d2b703c420bdbe9c89db4f4';
        UPDATE public.transaction SET placement = 106 WHERE height = 0 AND id = '738d5d8e6068e4866729318fb1e280e615598031b2bc96ccee51aea04151bb37';
        UPDATE public.transaction SET placement = 107 WHERE height = 0 AND id = '7743fbd0f6819c6b1ef3afe22d6170ba556c199a866841b8ee28dd0efcceb8f0';
        UPDATE public.transaction SET placement = 108 WHERE height = 0 AND id = '51f522290c0028554851c11bb2a7454dfdbb050cefd9992ff7d0a23c690a9962';
        UPDATE public.transaction SET placement = 109 WHERE height = 0 AND id = '595e6b73b43e0ef7b88323bdedf3fc721940ff4164aa113bf1c4d73620051481';
        UPDATE public.transaction SET placement = 110 WHERE height = 0 AND id = '642bb9f466b7f12d73aaf76a909384012345ef6b022e8b87926f115fb29eaf6c';
        UPDATE public.transaction SET placement = 111 WHERE height = 0 AND id = 'a8141a2305b2d3919b5f4cb8eec94c0d54bee683fcdc759c0832555f3ae060ac';
        UPDATE public.transaction SET placement = 112 WHERE height = 0 AND id = 'f7b3e7098f079a5cd648f1d7d1aecde972cb359edd5737491bc2ca3d9bffd886';
        UPDATE public.transaction SET placement = 113 WHERE height = 0 AND id = 'f4efccce79129615dbba3e63d1f2753e4d32228309b71d25ef3c0856eed2019b';
        UPDATE public.transaction SET placement = 114 WHERE height = 0 AND id = 'b4bf997ecae05d6f3646b2b114267e7e444a4ace99cbdf2e4f565894763d1ac4';
        UPDATE public.transaction SET placement = 115 WHERE height = 0 AND id = '7834e183b840b74860ad68ec29babf41c820fe97a94b0d013277d1caa19529f3';
        UPDATE public.transaction SET placement = 116 WHERE height = 0 AND id = '53f9da45b29a89bbbdaa1ee6f07cc8fd5575209676acd65923bce83079f55d74';
        UPDATE public.transaction SET placement = 117 WHERE height = 0 AND id = '093f996f2ead87ad499301fd05f79d6ad103b87688a02bdef13f12f21dd3283a';
        UPDATE public.transaction SET placement = 118 WHERE height = 0 AND id = 'ed97efa45757d8133541ad5d02f2eb67ae3c7845d8709fe6c4415e06f46ad160';
        UPDATE public.transaction SET placement = 119 WHERE height = 0 AND id = '3abbba33790391c3598be03376566ba6398ee152d4244aa152a656d886e28254';
        UPDATE public.transaction SET placement = 120 WHERE height = 0 AND id = '311f68374f23e1c476e04a4a0b86d16a6a61299ade36c28b6c86352fcf6cdd27';
        UPDATE public.transaction SET placement = 121 WHERE height = 0 AND id = '68609393882187b08bff976103f37563e054e67fc0d3547016cf19350f6c8fa0';
        UPDATE public.transaction SET placement = 122 WHERE height = 0 AND id = '6a653977f97fa0b9b13348a41cf5e305ff6104fb900e80ce3d2ee221e8b9fbf8';
        UPDATE public.transaction SET placement = 123 WHERE height = 0 AND id = '7725613962b6f8beb707977ea7715a38f17805862c76981ffa3e7d24cbe25f58';
        UPDATE public.transaction SET placement = 124 WHERE height = 0 AND id = '60089581f5390ab29400e4acf3e6d00a598dafbf7db99fe90cc88237e1fa1ff2';
        UPDATE public.transaction SET placement = 125 WHERE height = 0 AND id = 'b08bffe45f280622a7f7584e0e218489a3b3bdc1a89550559a09b8326cb40133';
        UPDATE public.transaction SET placement = 126 WHERE height = 0 AND id = '7e96297e870ccfa861507eb6be1fb6dada753a5ca0ebe3a203ee79bafbcf9465';
        UPDATE public.transaction SET placement = 127 WHERE height = 0 AND id = '458d82e822e249856c7fafc0e6015a01fbfcdaef2f0d7c6c9d71d6b53d78bf7e';
        UPDATE public.transaction SET placement = 128 WHERE height = 0 AND id = '6a72c3683df11f913222edc946b0904fd32baef1ee748f4927bfeffe788574de';
        UPDATE public.transaction SET placement = 129 WHERE height = 0 AND id = '8a905839a50596aeda1f443770818a16b08afa9330ed18351b9eb1e9c9eb23aa';
        UPDATE public.transaction SET placement = 130 WHERE height = 0 AND id = '222aafcf3959db9be70049a6124bd10d05e0c94155e1ff9563e3f3ce85955ab6';
        UPDATE public.transaction SET placement = 131 WHERE height = 0 AND id = 'ccfc48dfe2bdb5548a5601c28957f974e2de3b04b98cf5872b1e5584520fe485';
        UPDATE public.transaction SET placement = 132 WHERE height = 0 AND id = '3734a9d1e3eee991804a6ca06603075b062c6d44f57a80ecaf4c70929c56db30';
        UPDATE public.transaction SET placement = 133 WHERE height = 0 AND id = '26a5c1ea4f33eaffbf37277110a6bf9ed9009fb7c3c1b4fc3d406915a65343eb';
        UPDATE public.transaction SET placement = 134 WHERE height = 0 AND id = '48835621459cccac6de870339609aa9886cc8f1c041feb8a691e32b5d3382c43';
        UPDATE public.transaction SET placement = 135 WHERE height = 0 AND id = 'd07c495f11224779affce6138411b1af4127c42e2bdfcfec73168b4e6867df61';
        UPDATE public.transaction SET placement = 136 WHERE height = 0 AND id = 'b3602a03b61285ffcff5f78509bcbd8c1fb7a830d635fd7fd8b63d7198791d36';
        UPDATE public.transaction SET placement = 137 WHERE height = 0 AND id = '56373c7d68917ca0f99f8a2df7491023824b96bbbfe285d352b8b5ffdaf082c2';
        UPDATE public.transaction SET placement = 138 WHERE height = 0 AND id = '9e8c1a6a1b1c7890c2e2bb305f791c6d407437adca7873d6580465169180f5e8';
        UPDATE public.transaction SET placement = 139 WHERE height = 0 AND id = '76e8d49de45a6a5ab7051ac24966f837b318b43c0243728bab1cba226a8db6b7';
        UPDATE public.transaction SET placement = 140 WHERE height = 0 AND id = '3a7e5d6142955b02a6cfb7ba4b9a002765611d481ad3c21c012588105a1c538d';
        UPDATE public.transaction SET placement = 141 WHERE height = 0 AND id = '12d1625c0ae43a95fae64a621c2051467a2563c3ef56e262ccd08a6059e097dc';
        UPDATE public.transaction SET placement = 142 WHERE height = 0 AND id = '32062f885b176cb25a8921f9052b0a784695cc9844548ef8b00dcfd08b076bb7';
        UPDATE public.transaction SET placement = 143 WHERE height = 0 AND id = '5c21669f501d11520d4c2e0f02ad46fb4a0a15bb563a1778096d460ab11f5490';
        UPDATE public.transaction SET placement = 144 WHERE height = 0 AND id = 'b9d5d8f46e0260c598cc11ac359c7ccc91f270a9bf342349db6368f13e78a010';
        UPDATE public.transaction SET placement = 145 WHERE height = 0 AND id = '63504b5f178cde2b66a4ab7f051dd31e95c0347de751300d2b917c28d9cf98d7';
        UPDATE public.transaction SET placement = 146 WHERE height = 0 AND id = '193bf6fab1b9d16a8926e66f756ac7e62e85ae1bf36de5d33f6fc8c5bf60fedc';
        UPDATE public.transaction SET placement = 147 WHERE height = 0 AND id = '42979504eca87c370ff6deae1aadeb2edfd2bf6a9e2eb7de347f40dfaa3ef0bd';
        UPDATE public.transaction SET placement = 148 WHERE height = 0 AND id = '76cbe330bcb924ee943b5617a5cbac12ae565cd893c74a8234a1f39689a8124d';
        UPDATE public.transaction SET placement = 149 WHERE height = 0 AND id = 'd170fc3f49f1b51945657d9b0468522b1b10fea321cc0ca845bffe81299164cd';
        UPDATE public.transaction SET placement = 150 WHERE height = 0 AND id = '9e18be909a62f615fd7092d0951c63bcbed8ad9c2a8fe8991679a5393040b033';
        UPDATE public.transaction SET placement = 151 WHERE height = 0 AND id = '788306b526bdeb197d637fce4ce0f1353bbe2d29ecbed2a4d69138aa37cefd4a';
        UPDATE public.transaction SET placement = 152 WHERE height = 0 AND id = 'fae008b22a5277d967ac79add6fd53cf4ca22e38da980db44a8b8143e7e5d3c2';
        UPDATE public.transaction SET placement = 153 WHERE height = 0 AND id = '846994ef68adc9f1b241fc6b997d619027fcd2969eb517c04fb41e63d09771f9';
        UPDATE public.transaction SET placement = 154 WHERE height = 0 AND id = '7831e18cf8c99afb244b7c4b879f81f61b364959ee57704d263d41f3feca6c20';
        UPDATE public.transaction SET placement = 155 WHERE height = 0 AND id = 'ff9443cc755390e4428d7dcd81eaa171df7ebdd84e93656ea177699d1445b6d7';
        UPDATE public.transaction SET placement = 156 WHERE height = 0 AND id = 'd19347a66e453df9ae3990316efa27fef64acd6139abac83f611880af5bcc9c8';
        UPDATE public.transaction SET placement = 157 WHERE height = 0 AND id = '6ce40876316ddf56bcbd43ce22daae0107228137e407b49e9a035cdd55570269';
        UPDATE public.transaction SET placement = 158 WHERE height = 0 AND id = '0d4d832350581a19bfc215bf807c5b177ec535f84f7c4ba1fbecaa5959da0c88';
        UPDATE public.transaction SET placement = 159 WHERE height = 0 AND id = 'f0e64aeb18399bcd2f8388c11aa16ae0cc6f2287ac68503cfd091ca49204f4f2';
        UPDATE public.transaction SET placement = 160 WHERE height = 0 AND id = 'feff765044dd11c2933997876802366938b15bed4477125f6699287c0b2c1b5d';
        UPDATE public.transaction SET placement = 161 WHERE height = 0 AND id = '581f20b315a16b99a026179ccd119c62ad9271018232291a544687d89c27dead';
        UPDATE public.transaction SET placement = 162 WHERE height = 0 AND id = '97c4690c6219d4688605436f1fd44d0e832b48a1aac2abefa69b1d193c5e7837';
        UPDATE public.transaction SET placement = 163 WHERE height = 0 AND id = '94087382d17767dcb18f01f1b82e44ed25a13ceafaf6a2798963c4d001f07cfc';
        UPDATE public.transaction SET placement = 164 WHERE height = 0 AND id = 'a6c360168d6da8333674eaa120079adf3c3f2bf62b002b1231019cfa607c25de';
        UPDATE public.transaction SET placement = 165 WHERE height = 0 AND id = '291180e4007b68335f0218187d1bc3c6674235ac97f990b3d163a88f400debac';
        UPDATE public.transaction SET placement = 166 WHERE height = 0 AND id = '1ce4ef5ed15a0d36e082d055c65be29d56593e46a537e308cef022c8e7a27954';
        UPDATE public.transaction SET placement = 167 WHERE height = 0 AND id = '2425811a930727f0d6b5e76361d30deafb875f9e898c97422dfa48e60b8ff1f1';
        UPDATE public.transaction SET placement = 168 WHERE height = 0 AND id = '1a4c70c9e2a013d91c2ad95b1010a3f2243e1f4b9d6bdbf6959a6456b510ffe8';
        UPDATE public.transaction SET placement = 169 WHERE height = 0 AND id = 'e8e1cf0764a31803a7243b447516742adefbb3147ed2e7283dcbbf28c15b0c8e';
        UPDATE public.transaction SET placement = 170 WHERE height = 0 AND id = 'a161b3ab0a6a7d46d959480614e72f18442005cabeb863373b7e571e69c480f7';
        UPDATE public.transaction SET placement = 171 WHERE height = 0 AND id = '183a43f4f17fef23221d0159b04622980fab4d31c47a33064f1e335c4469035b';
        UPDATE public.transaction SET placement = 172 WHERE height = 0 AND id = '724a76d07ac995294fdd5a8fd15465c89fb8b04fb5311e91332f89d864d95b35';
        UPDATE public.transaction SET placement = 173 WHERE height = 0 AND id = 'adf6de4085edb14f9835f6c8d80f6054939444b07c5ea48cf3d3304b2b4a4401';
        UPDATE public.transaction SET placement = 174 WHERE height = 0 AND id = '71f63685caacab23f612c887d5b3474035c0f83fee46146a9fa12886d5fef5fa';
        UPDATE public.transaction SET placement = 175 WHERE height = 0 AND id = '78cf7728614a4e879c6cd6b52ed6e8f7b770b5bd560701bb24c732e3508e52b2';
        UPDATE public.transaction SET placement = 176 WHERE height = 0 AND id = 'cd2b1047cb4ef93f4a5d914b2c2ca6adf83bd3ab9f55e482f9ab216b58298b7c';
        UPDATE public.transaction SET placement = 177 WHERE height = 0 AND id = 'b4aa55c2f4375cd3e616899bddf0228b49db0f9cac0fe38a0aea7268674584d7';
        UPDATE public.transaction SET placement = 178 WHERE height = 0 AND id = 'e380dc9b4c8755fdace48155d86bedb7ff4db39a960de02192e83adbf91cc3c3';
        UPDATE public.transaction SET placement = 179 WHERE height = 0 AND id = 'f8b9aa874537b80c23af149301eb0c360bedb67577c4ed57895d289e7e38267e';
        UPDATE public.transaction SET placement = 180 WHERE height = 0 AND id = 'c5f5cc01fdba53eadcf81d969b70fe11a8deac50af89c5625afdb4b8c5b0522b';
        UPDATE public.transaction SET placement = 181 WHERE height = 0 AND id = '0fbec81f0e3661cb8606c219e9ba201d5bd8d4c1dd9a55d0512e9b6a44151b2b';
        UPDATE public.transaction SET placement = 182 WHERE height = 0 AND id = '023cd8000564f5bb43c04dafa75bf715d59647de9d6086c42a5b983ec1db81ef';
        UPDATE public.transaction SET placement = 183 WHERE height = 0 AND id = '509718b1b669b12aac797e273467fa68bbb55a16bc8b2647a980bb66cda40ab3';
        UPDATE public.transaction SET placement = 184 WHERE height = 0 AND id = '38895f59579de54360b6cfa627d2aa00cbabe9d6da6a8168e8ec24e6d232fdd7';
        UPDATE public.transaction SET placement = 185 WHERE height = 0 AND id = '5f2a4e354c593f4e29c88db361e187ea6356bfbad2e0b84107327721119cb3af';
        UPDATE public.transaction SET placement = 186 WHERE height = 0 AND id = '8821c71cc5396b2592ad15c4c3aaa343395f8a8af228b18c0a7db5ede34a9a9c';
        UPDATE public.transaction SET placement = 187 WHERE height = 0 AND id = 'eecc2812549eb5d6220e17e07719a5c7884304a197e7a45fcf52b99c5fed1ccc';
        UPDATE public.transaction SET placement = 188 WHERE height = 0 AND id = '3dad854b27f5a9f5fc05f695e37d0c4671e36b3a50bcc5f53d187baacece27e1';
        UPDATE public.transaction SET placement = 189 WHERE height = 0 AND id = 'e6c74f7c8b19ad8cc697e02555acb4abb7a0bb6b656a6eba5baaa22a026be828';
        UPDATE public.transaction SET placement = 190 WHERE height = 0 AND id = '68c85db8a07227b81e2f8504d9f0c2400a200608d0da29afccf20c76747ab42e';
        UPDATE public.transaction SET placement = 191 WHERE height = 0 AND id = '60b91e0454301367ddebc0717d4fff87ee5c797e49b110088d760367cc9e45d1';
        UPDATE public.transaction SET placement = 192 WHERE height = 0 AND id = 'a7d4630c2bcbc1b116b09a27e1b778444d6696e406549a255375f5530cce6792';
        UPDATE public.transaction SET placement = 193 WHERE height = 0 AND id = '67387a102b482ef3a0471c082340331d70fa99431add718e452218620bd9549e';
        UPDATE public.transaction SET placement = 194 WHERE height = 0 AND id = 'c9a1f8cab21e60b3c520e297bb2d2aff115b69889000cb579ec794d83ff35772';
        UPDATE public.transaction SET placement = 195 WHERE height = 0 AND id = '9533c69180350070cd483d367bff51a94adb5e4f329e2be1780ff0af9080c264';
        UPDATE public.transaction SET placement = 196 WHERE height = 0 AND id = '407f4f695187cd009bbe07025b2ce44b2241c8e6ee34e182501f3658b672a433';
        UPDATE public.transaction SET placement = 197 WHERE height = 0 AND id = 'fa0e41b0beec51e9a358ec32a8d9eaf9d2345bc916f17915db0465534031251b';
        UPDATE public.transaction SET placement = 198 WHERE height = 0 AND id = '13e0ebcba2fff96d50b310fda578746a4d8d120d1ff31f7c0e39349e566fe551';
        UPDATE public.transaction SET placement = 199 WHERE height = 0 AND id = 'b75f60435dda71a23108639afa6a99db5901bbfb554f1eae227e1119b45675df';
        UPDATE public.transaction SET placement = 200 WHERE height = 0 AND id = 'c58cef6e9e4cf4743226650352eb0723e31e3b2ec60e1d49fb959665a488a1ca';
        UPDATE public.transaction SET placement = 201 WHERE height = 0 AND id = '91e7c6b7eead8b94d053eee5cba070a1fd4ec93d916ee85459b8dc99e2a18fc0';
        UPDATE public.transaction SET placement = 202 WHERE height = 0 AND id = '3c6c6fa4316c63f64bc0ee7374a4635004c2a1a9f0c1e14cac31866a0986c69d';

      `);

    await queryRunner.query(`

        -- testnet
        UPDATE public.transaction SET placement = 0 WHERE height = 0 AND id = '7562b32b4a1f3f58f5ebd03663c7e9f722b537e60417312b5feebc46d702161f';
        UPDATE public.transaction SET placement = 1 WHERE height = 0 AND id = 'cb1ecf9deed0814b98487a05cf1abc6096b0d81774e66e8cd91980c2a411c355';
        UPDATE public.transaction SET placement = 2 WHERE height = 0 AND id = '3eff8383732d1dffd258bb4dfc20c2c3feb472a7f962f983468d5cc0bf2b493b';
        UPDATE public.transaction SET placement = 3 WHERE height = 0 AND id = 'fa30c300d452b1dcd73ae5e5d516ae537ec6f64845729927e0a95a50ff435e48';
        UPDATE public.transaction SET placement = 4 WHERE height = 0 AND id = '643a8021cbe7cce5a6482805684320947f3b93b80e7470e071312ba2d8bc3a67';
        UPDATE public.transaction SET placement = 5 WHERE height = 0 AND id = '90e82d5a521d9b3ea194e9272437e3ddefd773c293d0e71808adf04cce2d2790';
        UPDATE public.transaction SET placement = 6 WHERE height = 0 AND id = '4b0bd9f4388679124a4e76fff154edc903559e63ebf0c1a3304e182bc8282b1c';
        UPDATE public.transaction SET placement = 7 WHERE height = 0 AND id = '050495828415fb99d13f403fadb37aee53b752ebbc65fb5073219d8ae03778b4';
        UPDATE public.transaction SET placement = 8 WHERE height = 0 AND id = 'f279b6b5eb15579929e38ca4b44b10e658f6b7073a9fe101d5d539a7ec4e104c';
        UPDATE public.transaction SET placement = 9 WHERE height = 0 AND id = '8a3888cc5f5f52546ea5f9614e530e0e99ed91303aac904263381ffd284198fb';
        UPDATE public.transaction SET placement = 10 WHERE height = 0 AND id = '450a86f7f8159e30f66fbb0d65e3df3f3aba95421fdabe728527b1300f9d82b1';
        UPDATE public.transaction SET placement = 11 WHERE height = 0 AND id = '78610d25cbb64da41c67f335cee256d7b6293ab71a165387fe43fe45be8d5e9d';
        UPDATE public.transaction SET placement = 12 WHERE height = 0 AND id = 'ee7dc11b620e5bd2a48d813c54217aa661618f247594d9c96d9f2fac06588bbc';
        UPDATE public.transaction SET placement = 13 WHERE height = 0 AND id = 'e43a18f339e27bab01779b23af3c9e62af98d089d735ef0b471ef4a149ef8faa';
        UPDATE public.transaction SET placement = 14 WHERE height = 0 AND id = '37a13bad617a77c5fbce96b53520f6a17c4f2fadba12f3cc29dc5b87f72ea3c9';
        UPDATE public.transaction SET placement = 15 WHERE height = 0 AND id = '6c2a82234940f2f2866f5525b2df56b826470e36f99ce44ecf5b4a4207c5d851';
        UPDATE public.transaction SET placement = 16 WHERE height = 0 AND id = '6e1dfb2df6ef9062b22ad8420baf4d23bfd220f3fd79beee410f4139a9792a2f';
        UPDATE public.transaction SET placement = 17 WHERE height = 0 AND id = 'be6267f2afe35cb8679447550e6ae29fa0cf8a04ccc7d9980d977b4f49e8226b';
        UPDATE public.transaction SET placement = 18 WHERE height = 0 AND id = 'cf760ac59cb1dbe3b3977d7810dbb9f51f93df4775132e6642909d91275f4f15';
        UPDATE public.transaction SET placement = 19 WHERE height = 0 AND id = '76cbbaea8320ea93ec61b3c3db4b85df7f66fab119995bf8a8a843f5cf3078eb';
        UPDATE public.transaction SET placement = 20 WHERE height = 0 AND id = 'c3f23f8642e3fe9ea4cd76517510c1e7ffe627f44b7ab2535b461e1519b44322';
        UPDATE public.transaction SET placement = 21 WHERE height = 0 AND id = 'e13115a9ba49bdd35d91ab50d7fcfe81aea99426199f5532ae7de3002fc7d41e';
        UPDATE public.transaction SET placement = 22 WHERE height = 0 AND id = '83591dcd16651717a9a3504be8840e9b9f43ece53f8d84480e5b99d42a0ee519';
        UPDATE public.transaction SET placement = 23 WHERE height = 0 AND id = '92b9c4da2c469eeec01aff1ffc0d8c4e73281b89f9f185d9538d8070e7e65fd6';
        UPDATE public.transaction SET placement = 24 WHERE height = 0 AND id = '82f5a4bf8b1ca6663f6f060a9d489dd6381641e93e42a9437c98e856ef42c0e6';
        UPDATE public.transaction SET placement = 25 WHERE height = 0 AND id = 'fa20e2060e1267aae86d7cd5811ba3fbd0b4e5213446462413d6f92c48509f09';
        UPDATE public.transaction SET placement = 26 WHERE height = 0 AND id = 'db1594622c4d928c36b42fef5c63201b70dcd10f07a7c5d5ebdbd67bf7dd3f98';
        UPDATE public.transaction SET placement = 27 WHERE height = 0 AND id = '351f0d2160f9a5124c4c8682cc824b4eb2b93514c92db868eafc3006c55c31bb';
        UPDATE public.transaction SET placement = 28 WHERE height = 0 AND id = 'e58e8f097cd6fa1318ade0cabe64ca2ceeca382e7a41131c1f8d35257bf8c6d2';
        UPDATE public.transaction SET placement = 29 WHERE height = 0 AND id = '8286ab92784fca6a4d60b109609513b56109c973ace9226b9d3f7f639a1ecbe9';
        UPDATE public.transaction SET placement = 30 WHERE height = 0 AND id = '02597b31f834837a60e91dc4e954766eb78b1d3656b437d0c891a0df66504bdb';
        UPDATE public.transaction SET placement = 31 WHERE height = 0 AND id = 'a01d14ad715a8a1dd000d0fab04d900c9a42a313978167faf66a0f8e18288b99';
        UPDATE public.transaction SET placement = 32 WHERE height = 0 AND id = 'd1b3bac4d661673a62ab3e244d8a927af106dbb7a58339ffeeddf2b9fca52308';
        UPDATE public.transaction SET placement = 33 WHERE height = 0 AND id = '9ac449e10c2d31dbd07f532adb75a74e042587bc3e7ba7444f2e7f897e52df08';
        UPDATE public.transaction SET placement = 34 WHERE height = 0 AND id = '8328b10fbe20db11271fd633c31b40027003cef604ddd5c0b0a66311a45f7567';
        UPDATE public.transaction SET placement = 35 WHERE height = 0 AND id = '6463649c0c030bc9a183652d0e13e2b2cc39282166712c00e2bfefd6479f2224';
        UPDATE public.transaction SET placement = 36 WHERE height = 0 AND id = 'db53847e1485836a12dda2debd11a1fa5c281e721f841b69626940bb285ab632';
        UPDATE public.transaction SET placement = 37 WHERE height = 0 AND id = '44d527bf0e1c70a7f24e901ddbca1eca3d11f792cae7e823da6d107c25f53dca';
        UPDATE public.transaction SET placement = 38 WHERE height = 0 AND id = 'ce58c367596b3e0b4e4afe8e63feb32bfadc9dbc20fbcf4493f73c009ede840e';
        UPDATE public.transaction SET placement = 39 WHERE height = 0 AND id = 'd52de6622c259d5b1903ba25f41f1e1e168b519b433ae05296146767be3948d3';
        UPDATE public.transaction SET placement = 40 WHERE height = 0 AND id = 'c6dae09f1e9df02e6e6173d44cbaab9e70147a4c2acf0dc2f6c75ada55746453';
        UPDATE public.transaction SET placement = 41 WHERE height = 0 AND id = '1afee1e2d1c6d9a26f532ae487c1aea6d13abb6c35b02e7ca0c55297c7ec17e3';
        UPDATE public.transaction SET placement = 42 WHERE height = 0 AND id = 'd3a75c266ab333c91b72056f418151c831d837d7be47fec83650c6c31f06713c';
        UPDATE public.transaction SET placement = 43 WHERE height = 0 AND id = '182a796b4a3c56a51139afda438e9d2eba68b1fdfb660c0861c92561960eb34b';
        UPDATE public.transaction SET placement = 44 WHERE height = 0 AND id = '622a1cc478d0597ed104042fb6051d0771b46be4a67e3db8faecc26bf55779ed';
        UPDATE public.transaction SET placement = 45 WHERE height = 0 AND id = '48ecce8d8f9b18ad77c3778badfe448ad0d6114ea1e566f68e22eafc8f589a00';
        UPDATE public.transaction SET placement = 46 WHERE height = 0 AND id = '9cf4d18f0188365fe962a3824e149e29ef565a321ff4ae5ff611ef0e8effa68b';
        UPDATE public.transaction SET placement = 47 WHERE height = 0 AND id = 'e69b234f458922fdf7b5cd305b3ef492093fc08e221d87032ecf33a65bac15c2';
        UPDATE public.transaction SET placement = 48 WHERE height = 0 AND id = 'e9adc252bb17d8c3d29afa439bd2c830dfbd71420ea29f564ed222bc04fba08c';
        UPDATE public.transaction SET placement = 49 WHERE height = 0 AND id = 'aa1d329eb98bf12b9d01ee40d2ecb17932a8abac4df380fc83b44a62cd0ef1ee';
        UPDATE public.transaction SET placement = 50 WHERE height = 0 AND id = '52c15704dac2facc207d4753790d12bbc7279c5d2c3ba5025b29fa5a674ff14d';
        UPDATE public.transaction SET placement = 51 WHERE height = 0 AND id = 'fdc3aeb62dca56ed93404ae9da9595a88f4f8a2c552734ae8316d0651dfccfe3';
        UPDATE public.transaction SET placement = 52 WHERE height = 0 AND id = '9701526838fef1f301257b4d3a4be827c91763820a153061a7080e743ad80f51';
        UPDATE public.transaction SET placement = 53 WHERE height = 0 AND id = 'fb441003076c55f6a59a114aad7fd453c477517a04836ff5ea5f159885bc9795';
        UPDATE public.transaction SET placement = 54 WHERE height = 0 AND id = '389b3baa95b9f7c908bab3883035fd1cbf8a18ae3b3032ad4fae846a7b229a90';
        UPDATE public.transaction SET placement = 55 WHERE height = 0 AND id = '2db7f6faeabf749b46e759c18897ed471ff05cc7af59db97f324a4e15271fa1c';
        UPDATE public.transaction SET placement = 56 WHERE height = 0 AND id = '8a64b5e5d39cc5d0fefdfa884ac5e84a5c6132c2e1fadce4e61f5ffc7b1e1cd2';
        UPDATE public.transaction SET placement = 57 WHERE height = 0 AND id = '6281324b3efbaa09c531dbf024a7768a82985710fad6f35301f460aa403bb9dc';
        UPDATE public.transaction SET placement = 58 WHERE height = 0 AND id = '71bf4ed95660c0d5e9b62e764b9d00feaa83ddcd89b1d65d1473805473c0e90e';
        UPDATE public.transaction SET placement = 59 WHERE height = 0 AND id = '39ffb795bb360e082d65291115333ae0b3b8d5e6478551c989ead3d6d7e4b36d';
        UPDATE public.transaction SET placement = 60 WHERE height = 0 AND id = '3b282376f71b7ff547fa10d678081f9f16a9c6c1aebb6491717f5509e56f193d';
        UPDATE public.transaction SET placement = 61 WHERE height = 0 AND id = 'c68a4ce940608b6c1ff93723cb590ef12f923b710f69cda93eb6d1e7d24f4b4f';
        UPDATE public.transaction SET placement = 62 WHERE height = 0 AND id = '70fad7ee30904d8c688eb3a533f5338684c1eb3c26084da5505a0f2db7769b04';
        UPDATE public.transaction SET placement = 63 WHERE height = 0 AND id = '080a271c681d7abf7873f67b1bd0d21723a2a8a2f3153a2d42344f43e62a97a6';
        UPDATE public.transaction SET placement = 64 WHERE height = 0 AND id = 'c81ea806e48b7a7891667c7d71d0cb120654a0acc02b76164b4d7eacff2b24cc';
        UPDATE public.transaction SET placement = 65 WHERE height = 0 AND id = '6b32427873c91a81ddff06566a0adf6381a2060c89aefe54cd55387be98043e3';
        UPDATE public.transaction SET placement = 66 WHERE height = 0 AND id = '16296cbcabf54a7ed26260a75b98c21b7fb5827cf563df5ea486db14e98997bd';
        UPDATE public.transaction SET placement = 67 WHERE height = 0 AND id = '60b0bab95b9ea39b1d6142b5c010d4aaa2e87c3025ce50d9fdc6d9ba3295174f';
        UPDATE public.transaction SET placement = 68 WHERE height = 0 AND id = '6116fc33cfeabfadc2e75f04b368520488031e7b67fdacc6c8b34add99e2a07a';
        UPDATE public.transaction SET placement = 69 WHERE height = 0 AND id = '5e3221346fa4beac3b793d5cc12b6ec4ec6a8d5fe38989f5da899bc7ade9a0f4';
        UPDATE public.transaction SET placement = 70 WHERE height = 0 AND id = '5964b0942f2da3ae55007ae010004c20dd635c9bf2cfa46545502e38b416d12b';
        UPDATE public.transaction SET placement = 71 WHERE height = 0 AND id = 'a587044a4e6452d50d8e61d6a5e3bc77f80b549fa1ff1c4a2026697163d29f31';
        UPDATE public.transaction SET placement = 72 WHERE height = 0 AND id = 'a14c484314ba6d1615cf5859ca249d57c51aa8bcb72fb8879dd20493ccd2c020';
        UPDATE public.transaction SET placement = 73 WHERE height = 0 AND id = '05fc73ca3114c4ce394dca99e531a314c814bc72d0decb3b6608dcc98f2073b4';
        UPDATE public.transaction SET placement = 74 WHERE height = 0 AND id = 'ebfe6446ad60684a8a0e709e0e2395c641c60e327c6f72614ec4bc82bc2a9cb9';
        UPDATE public.transaction SET placement = 75 WHERE height = 0 AND id = '6e69bbc63bee67f4b6afedd4d6a931e6049384b57477a9213fb6d5a9c1588e7a';
        UPDATE public.transaction SET placement = 76 WHERE height = 0 AND id = '9c55033f9929dc76d860293bbfa14556d3e860919e784b2bbe4dda0f2be235eb';
        UPDATE public.transaction SET placement = 77 WHERE height = 0 AND id = 'cc2203e9276247aeda933b65331916c444189f3988c0dc642d3eb2387a992386';
        UPDATE public.transaction SET placement = 78 WHERE height = 0 AND id = '3ecf8bf0cd8a4532b11ee905a46503c80e9176a3f083545275eb117bffe9ddf1';
        UPDATE public.transaction SET placement = 79 WHERE height = 0 AND id = '73055b670e149ce75438363c903e5884a722a26a528f59d5683d8a632dbcd1a5';
        UPDATE public.transaction SET placement = 80 WHERE height = 0 AND id = '25dc5bedf472014faa216e208a0c70853f8036076028c1644ebd9793b7359476';
        UPDATE public.transaction SET placement = 81 WHERE height = 0 AND id = '5ba0f2fc6bf10628d9b4cd236d1ad35bb9f5ceba2d13f0ef1dac8604be8d7c9d';
        UPDATE public.transaction SET placement = 82 WHERE height = 0 AND id = '4de70d881968496df5f8af96d383ac40ad166b10eacf253f33e21836a62039b3';
        UPDATE public.transaction SET placement = 83 WHERE height = 0 AND id = '0497fe062542553c15a8034914e01c3374d7b3e1ff1f1eff50133f0d205c212b';
        UPDATE public.transaction SET placement = 84 WHERE height = 0 AND id = '3ba05e817cd906e4fc98d44b8dedf50746365c939735278c88b042520cd1a070';
        UPDATE public.transaction SET placement = 85 WHERE height = 0 AND id = '8a5e61f8ab29ff9903cf5d3c5ef2a566408794181bf5e659fe8a34539be1b017';
        UPDATE public.transaction SET placement = 86 WHERE height = 0 AND id = 'e5c9f74e73f2016153af579f34d81d9b44a20a7ea9540170d4c169c725f87214';
        UPDATE public.transaction SET placement = 87 WHERE height = 0 AND id = '68e4b4bb89c0bb94b884056e186c6cd37c1635b1a1906637bd2c80834d218809';
        UPDATE public.transaction SET placement = 88 WHERE height = 0 AND id = '3326c8d0ff27c61206174ca9fe5ccaf81fef18f3ef5f09909faa70cd3d0bedc1';
        UPDATE public.transaction SET placement = 89 WHERE height = 0 AND id = '633b08b4cd84da27fad131672fe0cd25ddd93c2d3720fabed9e35a690cbd30f2';
        UPDATE public.transaction SET placement = 90 WHERE height = 0 AND id = 'accef78977436a3165549a4dddf6918543e3bd7db526a61bb77e69c68437c49c';
        UPDATE public.transaction SET placement = 91 WHERE height = 0 AND id = '36d7c5534e6de2233b457e757929256b99f9757177f3a67772a2ae01d91cbfbb';
        UPDATE public.transaction SET placement = 92 WHERE height = 0 AND id = 'cff1ead5ee3be430e00aace1cb3b01b46bc9009646f3b5d0bf6c5230697108c6';
        UPDATE public.transaction SET placement = 93 WHERE height = 0 AND id = '1a6135b1bf2375d6a87aa39423d64e9e8c42ee8a7ecf88a9bf195c8a12d78075';
        UPDATE public.transaction SET placement = 94 WHERE height = 0 AND id = '5aafba634b7df12a538d5f8c564495cddf0f7dc21251ebde7f63bed0ee026e34';
        UPDATE public.transaction SET placement = 95 WHERE height = 0 AND id = 'e4b4455f6fae7221300979f8209b22bb7fc2c2bf0ccac9fa369f3751f6f77ae1';
        UPDATE public.transaction SET placement = 96 WHERE height = 0 AND id = '9f2d4bca85650490ebfd7e764efd69a825102f8016823e54c000964cea87bbbc';
        UPDATE public.transaction SET placement = 97 WHERE height = 0 AND id = '04d23a3b477680c353a395d1ffcb3a58eb7049aad452da5d4459b5a3650f6f8d';
        UPDATE public.transaction SET placement = 98 WHERE height = 0 AND id = 'e21c98bdf91d7d96e35d2dce22cd9c70904d01558270da9ff556441f720d6097';
        UPDATE public.transaction SET placement = 99 WHERE height = 0 AND id = '368fe3150d447eceb90f5ef345a7861f39dc82cec4c023e3e2a52fee54e8072c';
        UPDATE public.transaction SET placement = 100 WHERE height = 0 AND id = '5914f2b8e56ec54870096c48aa5cc64806644724d9076c2f637c0fdeb69705d9';
        UPDATE public.transaction SET placement = 101 WHERE height = 0 AND id = '92d3e270bed10bbb567cca71e255f8c6d5739c06e077fb7ddb110f9b26b5e4e8';
        UPDATE public.transaction SET placement = 102 WHERE height = 0 AND id = '7408c6dcce98db663fd36c2d1280202d9ba96978c58ebea1e7b5a88cced0b49a';
        UPDATE public.transaction SET placement = 103 WHERE height = 0 AND id = 'fd031cb69fc6599c5741ac68eafbb47fedfb6f590d5058762a3d83856ca09d10';
        UPDATE public.transaction SET placement = 104 WHERE height = 0 AND id = '1d28dd081f2fa4a9aecbf36b18ccf9ef2f3792f158e7c76fe29ac51f164cd5c2';
        UPDATE public.transaction SET placement = 105 WHERE height = 0 AND id = '4e9745ebba79be66624264c8594863d6f3199ff1737e1cc0174d2e154db74aa3';
        UPDATE public.transaction SET placement = 106 WHERE height = 0 AND id = '6927930d5e266c1e7b681158a88dc3175c5d29be6608cfddc09452cde86c447d';
        UPDATE public.transaction SET placement = 107 WHERE height = 0 AND id = '3edecf221f0ebaa9539cbd6d1fa000abc87a0dfa18acea54e382a2753539db9d';
        UPDATE public.transaction SET placement = 108 WHERE height = 0 AND id = '9be7e106cae7e10f9734c4de8b4bdf25de2a91644f16d9c3df5aaed4a68debcc';
        UPDATE public.transaction SET placement = 109 WHERE height = 0 AND id = '7aadd9fcfc965a7c0d7c94e177d14d3f002b6c5b6bae987dcc60ca6fbb38d8a8';
        UPDATE public.transaction SET placement = 110 WHERE height = 0 AND id = '290ce82a846e50aa0588ee82778f398ce0650a6786fdfffaa8dc8cdcba0f0333';
        UPDATE public.transaction SET placement = 111 WHERE height = 0 AND id = '86e96b73d617bd330c13e79e6609b0fd2715e2103f1f9883c30e8b8b20fa36d9';
        UPDATE public.transaction SET placement = 112 WHERE height = 0 AND id = '8e72a674f6cbb4fd6efbaee9830f591960421769edaad6b34e19f3cdc0d05435';
        UPDATE public.transaction SET placement = 113 WHERE height = 0 AND id = '18d0cb2a01958a174fe25c6e3ac5bcec7e44636abb3390f3715b4f60e2f07a75';
        UPDATE public.transaction SET placement = 114 WHERE height = 0 AND id = '4e45be70bd429b6ff0c82ac4f06cec49657366d96218b98b2dc9ae66494c4173';
        UPDATE public.transaction SET placement = 115 WHERE height = 0 AND id = 'b5bd589dee9a2dad8a735fbc42812d53d3f26464bbee35db6e78cfa9ddf5e9e3';
        UPDATE public.transaction SET placement = 116 WHERE height = 0 AND id = '56db79a6cb8e63b6383c75d012b9843f5200d81867f03121c74f98de7ac60f9e';
        UPDATE public.transaction SET placement = 117 WHERE height = 0 AND id = '5aa887b29726ce5b5d33425276f95dfbe407949beb325e4d4cf070975201b84f';
        UPDATE public.transaction SET placement = 118 WHERE height = 0 AND id = '32220ddf43702f11066bf7a22114647fe44523951136b97371e71f9eb8bc7bfd';
        UPDATE public.transaction SET placement = 119 WHERE height = 0 AND id = '563699615f7d39fe24bb8ada922626b5cbe658fee5dffd9d785b50a97739067f';
        UPDATE public.transaction SET placement = 120 WHERE height = 0 AND id = 'b2ea87831dcea8669964f629d36c3cf5b885b268439249ab5ff397ecf9a07ff5';
        UPDATE public.transaction SET placement = 121 WHERE height = 0 AND id = '8ef96ce3dc744ecf7784db7ccbeeb365a795c897a862352005bf7bb7ff3c1595';
        UPDATE public.transaction SET placement = 122 WHERE height = 0 AND id = 'e7726a0e6cf23f82c504d844391f9118df610d78f5af005deee7c0c4b5118fdb';
        UPDATE public.transaction SET placement = 123 WHERE height = 0 AND id = '4e9a7beb6410d9e68f8619029befd1546312dc55bfb9b706ffff547f828b3b4c';
        UPDATE public.transaction SET placement = 124 WHERE height = 0 AND id = '71648a249947ffacc66053a514dd4a0db5657633e28ac2d6bdd549e0fe860686';
        UPDATE public.transaction SET placement = 125 WHERE height = 0 AND id = 'd5997138d72f9f4347e77f88abb36ba29fae8a4ddb43a436940b5538c3110ba2';
        UPDATE public.transaction SET placement = 126 WHERE height = 0 AND id = 'b2e8f0c35cad8604381019f82057c4f0001b91b17a4e4ddf0531efbee00dbf80';
        UPDATE public.transaction SET placement = 127 WHERE height = 0 AND id = '40f1db81b69e57f271a6391ba4a0d337ea5e0287bd11b2c986194018ab163550';
        UPDATE public.transaction SET placement = 128 WHERE height = 0 AND id = '9a7ac5d8ca42ee4636d3bb33093e2352a1738e0d3091cc9e9a483f03924b6377';
        UPDATE public.transaction SET placement = 129 WHERE height = 0 AND id = '70695caba7733a41ee4a4d405447ad8ab61f3e70e56b619beef2f2dd3bc93a27';
        UPDATE public.transaction SET placement = 130 WHERE height = 0 AND id = 'e7189303d11d4ca0ac37eaae470f49f50421dbe678d12922ed5604587a48510a';
        UPDATE public.transaction SET placement = 131 WHERE height = 0 AND id = 'd585cf5756755bdf294fe2ca7da28c3a78f1ef4f5eda5ee85e1beb034dbf1a87';
        UPDATE public.transaction SET placement = 132 WHERE height = 0 AND id = 'f564e221e9d7a128c11d4cfd0ea69a99be9d2427c642e94eef78e35a4a8f1b30';
        UPDATE public.transaction SET placement = 133 WHERE height = 0 AND id = '4354f83b14052ac2cc51cbb727dfee582769712fc8cd9caa7b447441687b1254';
        UPDATE public.transaction SET placement = 134 WHERE height = 0 AND id = '38e02b2f09b1140e529d786354ae68494af1455970fa97c84590ecb862edab27';
        UPDATE public.transaction SET placement = 135 WHERE height = 0 AND id = '4d64a38deaf39094864268ed665f26ab384eda1110c8a68e90f8cba7c132c86b';
        UPDATE public.transaction SET placement = 136 WHERE height = 0 AND id = '1df0663140c5120ef009a38a3c77bc0fb4833bc9d9bcd4ed4b115eb0075ff50c';
        UPDATE public.transaction SET placement = 137 WHERE height = 0 AND id = 'f9cce958d687ad016a6a99105e18bb7f89be420f04b4a6f5926979e1cd79fbba';
        UPDATE public.transaction SET placement = 138 WHERE height = 0 AND id = '818872be73b95d5858b57c20a7bd81e44a00d4712d10882a2a604dadc2148585';
        UPDATE public.transaction SET placement = 139 WHERE height = 0 AND id = '1fd63a237df974a23f856d2554be67d623dbf9e082cd72ab06172e01c539f6df';
        UPDATE public.transaction SET placement = 140 WHERE height = 0 AND id = 'd4d0549af1cbf81f4d82a903176ee82578f94f7e4c92fcb79ad2c2dac5be97b1';
        UPDATE public.transaction SET placement = 141 WHERE height = 0 AND id = '4f88728ebec4b2efea9bdde199368e302431caf9e891cf143a0eb33609b5e3be';
        UPDATE public.transaction SET placement = 142 WHERE height = 0 AND id = '7ab26532f643cbe9b689e675f90317da921f173d8e7b32cda09b6de360cae7f0';
        UPDATE public.transaction SET placement = 143 WHERE height = 0 AND id = '7e3bd0a144c94cd81e1bf3b338ba474bf6d56005e91ad7befdca5f14a52030b8';
        UPDATE public.transaction SET placement = 144 WHERE height = 0 AND id = 'd3d747830b5ae3907ebf851034cff4bad55344acf6bccf28fbe90e51278353cc';
        UPDATE public.transaction SET placement = 145 WHERE height = 0 AND id = '35cdc0b9cae208659f2fe6ae4d57ac3c8504d85ca11963c946835af9e365bdd5';
        UPDATE public.transaction SET placement = 146 WHERE height = 0 AND id = 'f19c855932feab8d0e95d3d1ca15ac5cc501d8762fa4861c333465ba2e653d1f';
        UPDATE public.transaction SET placement = 147 WHERE height = 0 AND id = '8de79e99a5ca96c510f64f9b01d50fb57e123983ad3c3a9beda3a32316b71d51';
        UPDATE public.transaction SET placement = 148 WHERE height = 0 AND id = 'ca8ceb4e1a477b345a66384609876ca088900af945536733751c04308d946624';
        UPDATE public.transaction SET placement = 149 WHERE height = 0 AND id = 'cbbd5d0e7ebf3e570dcdfbd453fb64087456eb416700800e6120586f58b2962b';
        UPDATE public.transaction SET placement = 150 WHERE height = 0 AND id = '9b1ee72975e50c45bd44579d8d15a4340760dd1ac1c09a5024631e2a2e041e25';
        UPDATE public.transaction SET placement = 151 WHERE height = 0 AND id = 'ef12d883613a39a6808289f7b8766ad31b5e238e8c0d34c9dc456abc3568e1ce';
        UPDATE public.transaction SET placement = 152 WHERE height = 0 AND id = 'a0a9eb6f2f499a571c4d49eda416761af83e1cdcb44efde84f8df98226ce240c';
        UPDATE public.transaction SET placement = 153 WHERE height = 0 AND id = '92cf761b36519a93b58272f8e5f8a7332832602ba65508b38d302967f46e21db';
        UPDATE public.transaction SET placement = 154 WHERE height = 0 AND id = 'efdc8a6120075b18d100c8835709f39cbc2714ecc5c4b922492831fa131f70c7';
        UPDATE public.transaction SET placement = 155 WHERE height = 0 AND id = '4446ef8826eedff148a9c1f091a5ea883c091c8ff5e7c4c216016af91c2a87be';
        UPDATE public.transaction SET placement = 156 WHERE height = 0 AND id = 'f7765751211f5b025bdf22feb8d8ae12db3fa4a6c9ddbed8adc2caac9bd2b124';
        UPDATE public.transaction SET placement = 157 WHERE height = 0 AND id = 'd06d6eb14be687aff3163100b8027b5fd437180db2134e839c8fe8c85225f694';
        UPDATE public.transaction SET placement = 158 WHERE height = 0 AND id = '511ac7134328b9758841554a135ce22ee0b7d0d5d4c7ab03716349618997ce92';
        UPDATE public.transaction SET placement = 159 WHERE height = 0 AND id = '4f46d2f3f5b1ddb131c8238747e7407ec400dad52bbd35237c4c28a3851a2817';
        UPDATE public.transaction SET placement = 160 WHERE height = 0 AND id = '80c6440a4660eeb3395d4dcd06799a08fd8dd155eddb4218da8dace8c240fdca';
        UPDATE public.transaction SET placement = 161 WHERE height = 0 AND id = 'db27fcbc428549be8500ec84e1362dedd25dc61e77e7cb76d82f2386c607fa2d';
        UPDATE public.transaction SET placement = 162 WHERE height = 0 AND id = '4556f81d960412190e80cf9c4a51895f04d49da886d7d4d2194f0c6f40b8cc16';
        UPDATE public.transaction SET placement = 163 WHERE height = 0 AND id = '64ff607a3035d9156c8b8410d4eb859ad59f25d497be6a46de2f66aa4850c492';
        UPDATE public.transaction SET placement = 164 WHERE height = 0 AND id = '0ef574ed432b0d1c4eb41b737b93281a0af598a398cd5c8cab1030de0dd60654';
        UPDATE public.transaction SET placement = 165 WHERE height = 0 AND id = '2e252f23be492413e30f4b07b5fa52aa0f5f5c32c2f3615f7341624bfdc9b09a';
        UPDATE public.transaction SET placement = 166 WHERE height = 0 AND id = '441d612332a772f805e1bf4fb6f810ffc5212c78c403aacb8eed78ead6cbfeaa';
        UPDATE public.transaction SET placement = 167 WHERE height = 0 AND id = '6172cf705918c1a7bf3d2f07f578b194b704cce092ecf67981b8f080db2aa67b';
        UPDATE public.transaction SET placement = 168 WHERE height = 0 AND id = '30fa061b9661addc5bce65dff69fac7d0d8fdccc30cf40c9e1e380f9d00666c7';
        UPDATE public.transaction SET placement = 169 WHERE height = 0 AND id = 'dc884682f816246c0ee7db04b8e4ff7e38d88d3272952cd474abb5fe8664760b';
        UPDATE public.transaction SET placement = 170 WHERE height = 0 AND id = '0feaa597f4c3d312f2a6acc9762cd85bb75a06e247ac238a5f40d629efec4e71';
        UPDATE public.transaction SET placement = 171 WHERE height = 0 AND id = 'e88e434499bd69fff13388113ceee55f61d746b3b6ee1c14d87b2d9d6788d2d3';
        UPDATE public.transaction SET placement = 172 WHERE height = 0 AND id = 'c932a396855d8db9f91bda2bfd8e57050fa33e5b5b03da6e71866ed7049db0a0';
        UPDATE public.transaction SET placement = 173 WHERE height = 0 AND id = 'fd2db11e5d8aa46062c11fa2cd0d6528a10874d608356f33cda0563bfb335a31';
        UPDATE public.transaction SET placement = 174 WHERE height = 0 AND id = '15cd3ef1b08497f25f049d950239773e8caf9aed5905adc96fd9f32095f30b77';
        UPDATE public.transaction SET placement = 175 WHERE height = 0 AND id = '5c41622ed8105628be5ac251d2f9716c18e09777dd6a07cdb90398fc3401ac81';
        UPDATE public.transaction SET placement = 176 WHERE height = 0 AND id = '6c29d0ce3e6ffa3219e986ff023227be01f8f2dbefc785380354cd62073466e6';
        UPDATE public.transaction SET placement = 177 WHERE height = 0 AND id = '59fc02306bd62c23c3bae40a1e004d809a8a5f5e545b8862cf4ade6980843ea5';
        UPDATE public.transaction SET placement = 178 WHERE height = 0 AND id = '0395ffe839e782e2034beddae7f9bdae1b76d253f7b8fe7f73313075511ede6a';
        UPDATE public.transaction SET placement = 179 WHERE height = 0 AND id = '7283b3d3f63b759efb6458ac8a6e5601667437729cf4c2e36a1509f9ea189015';
        UPDATE public.transaction SET placement = 180 WHERE height = 0 AND id = 'f8bdbe7844ccddd19d25ad7b234a235fa5cb361cc1dca89629264fe943feb2b6';
        UPDATE public.transaction SET placement = 181 WHERE height = 0 AND id = '26d556cd633ac0729a15ec6a95660d8f7dd619120b57190d30b8d78ea00bcc8c';
        UPDATE public.transaction SET placement = 182 WHERE height = 0 AND id = '53c0c2808bbddabb984b0e9e82f6f3fcb8bb172982e49c367e22d1723ab709c5';
        UPDATE public.transaction SET placement = 183 WHERE height = 0 AND id = '62e658dafc50203de1ed5cc1e94a2618f36c38723bb5541f5c3428c91dd26533';
        UPDATE public.transaction SET placement = 184 WHERE height = 0 AND id = '7aaf30e6826ec178c7db2700eec2bad31bbb9fd4c5d4d8910c11b22b4518b7da';
        UPDATE public.transaction SET placement = 185 WHERE height = 0 AND id = '07d9e795bb6c10cace31c856c1c8e8404c2075323001343cddf018ce4dbbf0d8';
        UPDATE public.transaction SET placement = 186 WHERE height = 0 AND id = 'fccf4bb741f45bb2f94cfef25da6a0215f05dc48ff9d9b437498855147a720cc';
        UPDATE public.transaction SET placement = 187 WHERE height = 0 AND id = 'f3c0f9ff43ca51475a4b0c677f27e1d92ed81985afaef82cc5d583be4e84c95a';
        UPDATE public.transaction SET placement = 188 WHERE height = 0 AND id = '31c7459ad77de08123c4e883d08ebedcbbd6177f7da162b1710d7f10fbbf5b86';
        UPDATE public.transaction SET placement = 189 WHERE height = 0 AND id = '6f9f45066cfb25677e59494329e7ed2439db1c57605b37e8a58629eb9641ae46';
        UPDATE public.transaction SET placement = 190 WHERE height = 0 AND id = '32b8dd5e38a879bc5d0a19bb37047c255f2335abb34d2deb5227d62132f8b700';
        UPDATE public.transaction SET placement = 191 WHERE height = 0 AND id = '41940df52ff019c5098fbc7eb125f2278a7c152f02d56e3353ea9cf0a3486081';
        UPDATE public.transaction SET placement = 192 WHERE height = 0 AND id = 'b4235e80aeafca86064efc44f52c177c88990defc294741bb4b1006c0c2f864c';
        UPDATE public.transaction SET placement = 193 WHERE height = 0 AND id = 'd100e1b5c433c9e0570c4b31882cc6df996d2f6e7d729c9d04c1735e6536447c';
        UPDATE public.transaction SET placement = 194 WHERE height = 0 AND id = 'a5e08bc841901d67ff0dfc2d8e20238c7b3d2cd2f674f1a117af5741d909afab';
        UPDATE public.transaction SET placement = 195 WHERE height = 0 AND id = '6f854415ebc8b1ce939158a1cef71fd7371017b790cc9a8ecb1d620e294696c0';
        UPDATE public.transaction SET placement = 196 WHERE height = 0 AND id = '0cbb40b137414e60c8fcb236ddd52ad1ae11a8c5a73568793bf7141c0f236a06';
        UPDATE public.transaction SET placement = 197 WHERE height = 0 AND id = '72384cdf8a09b14d9168243b03d1344829b84273079149f2bccd31487c0df868';
        UPDATE public.transaction SET placement = 198 WHERE height = 0 AND id = '709dffbe9dcc13ceecdf573a91dbed325eb097e2ced8419c4e5b476b5630b722';
        UPDATE public.transaction SET placement = 199 WHERE height = 0 AND id = 'b74c7fca42ec311acea894be1fc166e679c3f1078dcae1a0aa1d88c17c6a65e5';
        UPDATE public.transaction SET placement = 200 WHERE height = 0 AND id = '13db343c0bd61203d52292752dae206ca7aab8afab8264d64092e57358fcbaa0';
        UPDATE public.transaction SET placement = 201 WHERE height = 0 AND id = '1c6364b03521557b60a20c2acfa320aec9a5f1594e876c9bdd2a7d105ec7b53d';
        UPDATE public.transaction SET placement = 202 WHERE height = 0 AND id = 'efef16c9d55cda5e70f55e3b45952f524d63558494a8ca5baaf8259ceabb045a';

      `);

    await queryRunner.query(`

        -- mainnet
        UPDATE public.transaction SET placement = 0 WHERE height = 0 AND id = 'bdc422902d45ace46e6444c660b4123932a357ced46ce7a6f69121c53be8ee35';
        UPDATE public.transaction SET placement = 1 WHERE height = 0 AND id = '0ca3a7450b859902067aaee64723c3af22b7ffcffe06869e50a1074f909567c0';
        UPDATE public.transaction SET placement = 2 WHERE height = 0 AND id = '07637a790dfe81b52ebc53727bfcb35fa3c9865c079b129e3299f2d8bf23f173';
        UPDATE public.transaction SET placement = 3 WHERE height = 0 AND id = '140c887171d06defefc3a1afc95d9cc0c828d6ad5eb2614fa37d6790f7e3437c';
        UPDATE public.transaction SET placement = 4 WHERE height = 0 AND id = '68af9d359275d47c53f000231467b4c1c6fc1186f8b9faddf1f9016e966bffe8';
        UPDATE public.transaction SET placement = 5 WHERE height = 0 AND id = 'd25230855c0c4cfbfdcdd5e03a07bec55d36438ef9c5ec871e963bc389a0eae4';
        UPDATE public.transaction SET placement = 6 WHERE height = 0 AND id = '06255c142697b3550697e678e19aeb3a25cc69d3be730c21a15db5ff3a86cb68';
        UPDATE public.transaction SET placement = 7 WHERE height = 0 AND id = '397128c81210e350bc222a71846e1d0b79e9c7b5266c75c0337cfbd54c71c8a1';
        UPDATE public.transaction SET placement = 8 WHERE height = 0 AND id = '1126d29551809948ec139bf94082cbea688ea11037139126a50dfe6988b99193';
        UPDATE public.transaction SET placement = 9 WHERE height = 0 AND id = '93bc2c4ae47c380a8628cb1e4fdf4559e7ae559e2f407efd5cd139efb0c8b246';
        UPDATE public.transaction SET placement = 10 WHERE height = 0 AND id = '3066f462bc3e2120b4f5d064b1f1c6fc195beb51b9311c0fdc1c86baeb8d305b';
        UPDATE public.transaction SET placement = 11 WHERE height = 0 AND id = 'bcc41dcc842d36b3cf6a1ceae0a56c70142af23b85d76761e6855c90041112a6';
        UPDATE public.transaction SET placement = 12 WHERE height = 0 AND id = '648ba55802222415b1f245daa3a2b63dae59c056d73344a9dde350fba3831ccb';
        UPDATE public.transaction SET placement = 13 WHERE height = 0 AND id = '1cdb5f9509429fc358467a21e722e0abc0cd48bd336bdcf10c979c2d6b51fb64';
        UPDATE public.transaction SET placement = 14 WHERE height = 0 AND id = '42b2e395a5451a263dfa7806862dc34ffbb75988208fc2131d1542f984ed4f07';
        UPDATE public.transaction SET placement = 15 WHERE height = 0 AND id = 'ee8ef5d00bab98373ea4c28ccba76fc181afb9d68422adc1b9cc88aa41a3806a';
        UPDATE public.transaction SET placement = 16 WHERE height = 0 AND id = '7da164704a9173bde45a7ebe2fee937031e7fa7386cdbe3883b94a96b4ad8079';
        UPDATE public.transaction SET placement = 17 WHERE height = 0 AND id = '82489ed4c9f4d7ac4ea1fd3197c4828cf2a5c347d0abdbe9944d8060512deb52';
        UPDATE public.transaction SET placement = 18 WHERE height = 0 AND id = '36cd1ba59e24deec42d136c0c80551bfdc9cf26d80b6bbdee3c241efdc79fbb5';
        UPDATE public.transaction SET placement = 19 WHERE height = 0 AND id = 'f9c2af12c35e87da5b6acbe412cdb9f99495c2421c9c01a855284fcb6727612b';
        UPDATE public.transaction SET placement = 20 WHERE height = 0 AND id = '877b1870ba29917e3fb5ec197c1d4cf6908beeb1d21f7a88a0fbf66869b60b13';
        UPDATE public.transaction SET placement = 21 WHERE height = 0 AND id = 'eb6368158f90c9a64b547d9409fbb07844bae0dcc604e3a39257f82b11b96b6c';
        UPDATE public.transaction SET placement = 22 WHERE height = 0 AND id = '4e39157a76f56c30a69723100962ff609aed03bde389d36e622a834353732b45';
        UPDATE public.transaction SET placement = 23 WHERE height = 0 AND id = 'acde639f9dc30a90ba496d767c58252c5708990f1841a599e2efb7850ea49521';
        UPDATE public.transaction SET placement = 24 WHERE height = 0 AND id = '7ca65f49d697aac26de4a0890e0293d2dfc31e8702d709aa9241afe6fbd15b28';
        UPDATE public.transaction SET placement = 25 WHERE height = 0 AND id = 'ee0dfdc075ea4cd89ba87ea9b0d1d50aa71f272870288f5db683592d040f682b';
        UPDATE public.transaction SET placement = 26 WHERE height = 0 AND id = 'e86344ee14594642a8ff56f7561ec386ec32cd009de23ae3faff3cd848ec16f3';
        UPDATE public.transaction SET placement = 27 WHERE height = 0 AND id = '289d8ac4ed7bcdcb153fd8bc33479fdab6d0456d2489c1cd3d76139d22d5fa47';
        UPDATE public.transaction SET placement = 28 WHERE height = 0 AND id = '4964b62b61fcee2ee5a6e4783205adf312bc889a3b3970b827d0a62b9ab5c799';
        UPDATE public.transaction SET placement = 29 WHERE height = 0 AND id = 'b0cccaea220b5ac0972c27e9705f1456e33626405d16cede2db57f23b7e944f5';
        UPDATE public.transaction SET placement = 30 WHERE height = 0 AND id = 'aa41adbbbb53094eb488e4d06f8d2bbcd56eb85820f0bd75df720b5d9b4d08a1';
        UPDATE public.transaction SET placement = 31 WHERE height = 0 AND id = 'e224a17f3653ae22fefd6742d37beede2c6718b1e0d0601774b15862414c38c4';
        UPDATE public.transaction SET placement = 32 WHERE height = 0 AND id = '180618da4cdeb411f2e24b34af8c05ad0112f965d9f08bc2a25d46c260b0a935';
        UPDATE public.transaction SET placement = 33 WHERE height = 0 AND id = '08c0b86b2d8ea60f49dffb7120e0944ef35032fcf39c2f4653ce6d64742852e2';
        UPDATE public.transaction SET placement = 34 WHERE height = 0 AND id = 'e7a374bdeba7b48535e848bb51208a037357d5e4371a96a97135ba1b4afcd59d';
        UPDATE public.transaction SET placement = 35 WHERE height = 0 AND id = '8f8f8903ed2af28c35c3c6c1cbca389bc773a460ff7be546fd1147564ce346f1';
        UPDATE public.transaction SET placement = 36 WHERE height = 0 AND id = '694da3f338121ba670dd5774ab95e8e622f5848a71ae0d7553383336f8243d19';
        UPDATE public.transaction SET placement = 37 WHERE height = 0 AND id = '69eee3d07fac3572f684a9da342333451bb995332cac29abc0e96393ee3238f9';
        UPDATE public.transaction SET placement = 38 WHERE height = 0 AND id = '744d82cf537515c9623eeb61e40422ee085c4cac2753b467600638bc5401e868';
        UPDATE public.transaction SET placement = 39 WHERE height = 0 AND id = '94caa6abea9c53c4f188c52fbec267bfff78c0d6a53862ce6ca33d7ed677198f';
        UPDATE public.transaction SET placement = 40 WHERE height = 0 AND id = 'b1927839d37d1abd2e47ee91a8692fde5c14f1f3c2fd7382bb1944f6600fd3ab';
        UPDATE public.transaction SET placement = 41 WHERE height = 0 AND id = '5f501c6b105abdedfa4308b96e567023d94c02f49754d988be2bd7e6e069f104';
        UPDATE public.transaction SET placement = 42 WHERE height = 0 AND id = '339cae06ec050cd012ac6753e7dacf572f2e9cf1a4856d350dbca0d1398990c0';
        UPDATE public.transaction SET placement = 43 WHERE height = 0 AND id = '2ca7706eaf3f61292e86b92b6d3a7f4ac67d91a4d72a683ae8c607d0d29fbaf0';
        UPDATE public.transaction SET placement = 44 WHERE height = 0 AND id = 'a03e227f12f7520380368d864aa26ae43d38974d12702b149696a118e979803f';
        UPDATE public.transaction SET placement = 45 WHERE height = 0 AND id = 'a811c16f4d5953806cbb9b718a7f8c3c1a65d02b77cfea6dc8b17ce64e73782a';
        UPDATE public.transaction SET placement = 46 WHERE height = 0 AND id = '63c89ca691c1bc9c5e3875a34937a1cc6d77da3ed84720c1a5cadc5a10b1a247';
        UPDATE public.transaction SET placement = 47 WHERE height = 0 AND id = 'f6fe70ccaa9e30fcda613cde421dc58e5e00599af09c8c90c4dfd1d41627c6ad';
        UPDATE public.transaction SET placement = 48 WHERE height = 0 AND id = 'd02b55690371604f12894271db493bd1f88be2ea9a946a4e563bb82209fb391e';
        UPDATE public.transaction SET placement = 49 WHERE height = 0 AND id = 'cca52562bef49980739c0f8148bfdd6da11fc007dc6ad57915cb49f7dc4939cb';
        UPDATE public.transaction SET placement = 50 WHERE height = 0 AND id = 'fb54bc2d7b56f3577f45c17cb9ca763f287d7aa8448aaee10aa01cb432e03ed0';
        UPDATE public.transaction SET placement = 51 WHERE height = 0 AND id = '555ccec2e13ae20ca294ccd95615e65a0ebf24c06493960e44f439796e478bc8';
        UPDATE public.transaction SET placement = 52 WHERE height = 0 AND id = '655c22c2d4daa4c062ecf4dfd7b2f43af1eab638430e94403dc824189845bc3c';
        UPDATE public.transaction SET placement = 53 WHERE height = 0 AND id = '834a27208c95dc94f7122331665716b9b6c5091e5bbb02391ac49df23106ed43';
        UPDATE public.transaction SET placement = 54 WHERE height = 0 AND id = '85821ca024b109637c71e7db6cd16010e0ecd51ed2fc2d1e8bcbe800383bf3da';
        UPDATE public.transaction SET placement = 55 WHERE height = 0 AND id = 'c4b8d2c192b7c75f8abe63d8b4e2a7d6508add6a53575fa7a49591292a9c107e';
        UPDATE public.transaction SET placement = 56 WHERE height = 0 AND id = '6fb703cd3a76fedceaa304bab243a9ccfda4f47cf425cb69f908ae46664a5daf';
        UPDATE public.transaction SET placement = 57 WHERE height = 0 AND id = '1e329e9a86304efdf84825bc2fae3a8c23898652239aaf4e3274bfa55a3cf90a';
        UPDATE public.transaction SET placement = 58 WHERE height = 0 AND id = '3996488f8a93358dd748b25b5d7a274d8cefa189a395d00092c74376daa5ae0c';
        UPDATE public.transaction SET placement = 59 WHERE height = 0 AND id = '4aef0336a4836c83fb3918545dc08a2bdd0295ac9fe691da4f421b2ae5ada484';
        UPDATE public.transaction SET placement = 60 WHERE height = 0 AND id = '42da17383151ef3304f4048d93611c9a1335e6095e3e65b41877520d8e8399e5';
        UPDATE public.transaction SET placement = 61 WHERE height = 0 AND id = '2ebf1ae3b182c45720beb763b62a2f3cbf6e8c603fc5cde130181b5033577ab3';
        UPDATE public.transaction SET placement = 62 WHERE height = 0 AND id = '2b56fa749c93630055dc8ef3e100dc771dff5c3f5e201d969eb276d4012e63e1';
        UPDATE public.transaction SET placement = 63 WHERE height = 0 AND id = '582f372c87d545314f11d261391107d13c1834859dc9a2bf05259ccc58f9a90d';
        UPDATE public.transaction SET placement = 64 WHERE height = 0 AND id = 'c8d245ed826ac5b6ef5d8b425e61d31a91f81e5fa8182641b254e742576fcf3e';
        UPDATE public.transaction SET placement = 65 WHERE height = 0 AND id = 'e5dd912160fcca86ee8ea5de1d399fa9f12323a6fc12853f4237e11330018ee6';
        UPDATE public.transaction SET placement = 66 WHERE height = 0 AND id = '41977352dfa63dd921b7a10f782933153dbfe1fafa3cfc292cee16de2d4b3b88';
        UPDATE public.transaction SET placement = 67 WHERE height = 0 AND id = '05571c1321c853a78df83e10a65476f768c6dd86083586326dfd26532a958e26';
        UPDATE public.transaction SET placement = 68 WHERE height = 0 AND id = 'cd7a78a26323399650362711fea5735e729a45c10af9d7c06ec510abb05b0cde';
        UPDATE public.transaction SET placement = 69 WHERE height = 0 AND id = '3656ec4a2e726afc3ecb97be0ba51d0f27110065270d29c12aec6391bb41582b';
        UPDATE public.transaction SET placement = 70 WHERE height = 0 AND id = '557183d3c83b24d0c14ea0bed414f6892ef903ea95502cdd2cfff059c8de6124';
        UPDATE public.transaction SET placement = 71 WHERE height = 0 AND id = '1454aa40053515bc1a3f84bbc23f821b99007bf540b24a4b87c162f77c0c8b05';
        UPDATE public.transaction SET placement = 72 WHERE height = 0 AND id = 'f4b89f663c47e63e7e485ca75464d5b732863e7375045446e5a6356b8876e753';
        UPDATE public.transaction SET placement = 73 WHERE height = 0 AND id = 'af71f3c2444af95d3d6fadccdc23b848816807e066b8190cf5dd4fd97b70ff00';
        UPDATE public.transaction SET placement = 74 WHERE height = 0 AND id = 'd263e0d2749781cd104d404151ac4f727805aa175b105e8e9248ea265d236706';
        UPDATE public.transaction SET placement = 75 WHERE height = 0 AND id = '8bd6849a324afbc25ad5e499367bb6222e0b40be1d5d01f4e6fb2364feff25cb';
        UPDATE public.transaction SET placement = 76 WHERE height = 0 AND id = '53369446fd49e252d998236edf9d93ace1bca8f198643950bfcb72a9c4c21a0c';
        UPDATE public.transaction SET placement = 77 WHERE height = 0 AND id = '375371df7ac072bef46cca67c56f6cd67b7b9177c8cc866f7cd4fb2e41fcef3b';
        UPDATE public.transaction SET placement = 78 WHERE height = 0 AND id = '79dc513c67a29ce909ea1223968d91cc90691d33b8fd4eef3b5e0654798f225a';
        UPDATE public.transaction SET placement = 79 WHERE height = 0 AND id = '8c2be6fae3a895828eb2c67597c0b7c31c570788862505b6bb7124e0c8733737';
        UPDATE public.transaction SET placement = 80 WHERE height = 0 AND id = '1370b9bf92f5525af5cae1fc59bd500ac4464fc088e59e342e38dc5986f96782';
        UPDATE public.transaction SET placement = 81 WHERE height = 0 AND id = 'de23ea1dcfa34d014401f07894d821b725bcd44b98373700b803d88c30a3ac59';
        UPDATE public.transaction SET placement = 82 WHERE height = 0 AND id = '5710ab530630eb5f56eb6d0adb9178165f0c380e0048f837ee9d17d93dd18104';
        UPDATE public.transaction SET placement = 83 WHERE height = 0 AND id = '281546b58436fda37057a78bbf2eca743099488567001ade5f711592d012d471';
        UPDATE public.transaction SET placement = 84 WHERE height = 0 AND id = 'b937a86a56cd50286cee951968bd859b08673e4dd0a2b6558a2b6a6bd3f9aef0';
        UPDATE public.transaction SET placement = 85 WHERE height = 0 AND id = '1a0b9861a3e6ef40bd594b95234b9491364d3eaf34d3fa2be998a1369c34f5c4';
        UPDATE public.transaction SET placement = 86 WHERE height = 0 AND id = 'b6874a9d477099d09f53ac6b44ee78e03d76e2fba198ac4621295d208c79400b';
        UPDATE public.transaction SET placement = 87 WHERE height = 0 AND id = '053118fdbcafe8734f5e27f4180a0164e050c1d9012ef5a4ade50e36e415e170';
        UPDATE public.transaction SET placement = 88 WHERE height = 0 AND id = 'c29df6061c35ad08e7ecb05df0b73b992849680959ea4a5f91cf7916bc379227';
        UPDATE public.transaction SET placement = 89 WHERE height = 0 AND id = 'a1d7f6bd2b4b20012b0f8e8d67c78479f256dcb15b30831006f23df88261e0b3';
        UPDATE public.transaction SET placement = 90 WHERE height = 0 AND id = 'f73b2a07f2524aa2f2ef0f3ae0b7d4e8078633d4eda9cc62ee0596432c079f96';
        UPDATE public.transaction SET placement = 91 WHERE height = 0 AND id = 'f29e34f58d735473f189df89c32a471870365824cfd87c88c7a2950637d76b0a';
        UPDATE public.transaction SET placement = 92 WHERE height = 0 AND id = '9fc716776ada838bf56dbb60e156bb8c27be01f7424f75e142caf9815fd44d09';
        UPDATE public.transaction SET placement = 93 WHERE height = 0 AND id = 'fad79f23c2c956891da7191c21e9b6c5a690646cb4bbe2d08a0bd165ec054392';
        UPDATE public.transaction SET placement = 94 WHERE height = 0 AND id = '5fed4a232b5bc7aa4a27b8433364f0811ec33f422ca82ddcf6ec76e0aa5830da';
        UPDATE public.transaction SET placement = 95 WHERE height = 0 AND id = '5364fb560c895c48be1ab531ef2c216888dcf4d38be24d9e2e93a2352068277d';
        UPDATE public.transaction SET placement = 96 WHERE height = 0 AND id = '590ff7fc4d72e4b1199a2872660d0fcadab6a569d34ac3a845d23f6d5d02e17b';
        UPDATE public.transaction SET placement = 97 WHERE height = 0 AND id = '8f55a9e787fd5209dd7e77e9bc8cc136d5ac4291552bc4762a0049311601fc52';
        UPDATE public.transaction SET placement = 98 WHERE height = 0 AND id = '0c32b6b1def9493a96430331afe26c3b4b3c51abab77c625cda6559e993bf43a';
        UPDATE public.transaction SET placement = 99 WHERE height = 0 AND id = '134ea88c862010af08fe72ec3edf785211a1bfdad58e9539a4facb1be24b08ed';
        UPDATE public.transaction SET placement = 100 WHERE height = 0 AND id = '46249da31271dd22118805dc8fc89c7d2002ed3ec3b239fa3816fb225b5e375a';
        UPDATE public.transaction SET placement = 101 WHERE height = 0 AND id = '5ba3fd04e00450fe6ccea6e215516080a4f86d7e05b325fb38b0d4815e997d92';
        UPDATE public.transaction SET placement = 102 WHERE height = 0 AND id = '8023ef0f6f2e6c4541597299b32e4f55392a8049bf7307d65b38894ee7f1e1b7';
        UPDATE public.transaction SET placement = 103 WHERE height = 0 AND id = 'be0769f8843763a2c350be3e7c87da4ea0c497f5f453d3b4d82b6dd5e51205f3';
        UPDATE public.transaction SET placement = 104 WHERE height = 0 AND id = '8990579f001145bc272327ef39942627d2b6b50891b9620c28c995ff6d5e655b';
        UPDATE public.transaction SET placement = 105 WHERE height = 0 AND id = 'df49f34aea708ceffae30067ecb8339edbbce7e76926dbdf779643300434c4d8';
        UPDATE public.transaction SET placement = 106 WHERE height = 0 AND id = '7326150b16306b4a3bb54e1488934270b6f4d0a2ed96621d4d01a089b82fb9a4';
        UPDATE public.transaction SET placement = 107 WHERE height = 0 AND id = 'ddfd8cefc5c364ad0b4747a896bbdf26a93951d8ca64ac7d4658e7db28b83f2b';
        UPDATE public.transaction SET placement = 108 WHERE height = 0 AND id = '89ad802c0c2a74100207d317c7e891deb40e98f7e05bdb92605120ae4b64860f';
        UPDATE public.transaction SET placement = 109 WHERE height = 0 AND id = '4df5fcb57eb64db33e3e8d7b0993016eb4754f8898a434ea9e48638068760d14';
        UPDATE public.transaction SET placement = 110 WHERE height = 0 AND id = '15cbc5040a76818b363b20ff5b4ee60af6ac800ffe52a5636396e2d1aa09f210';
        UPDATE public.transaction SET placement = 111 WHERE height = 0 AND id = 'd9375b92ea600840712400b403b14cefc653ca179b91a414794d042a36dae73b';
        UPDATE public.transaction SET placement = 112 WHERE height = 0 AND id = 'dfbb4a8271afbb841fd4ade8ac8100eb8a21a5c7356d650ff3849677e1b16418';
        UPDATE public.transaction SET placement = 113 WHERE height = 0 AND id = 'a6d3086feffbcb3b7df8e0cd90b918597396d7c59358188248d2387b2a644e7a';
        UPDATE public.transaction SET placement = 114 WHERE height = 0 AND id = '4aebcf2a8757b1cde679b36e6d5e01c3dc8dcbd011391d5e9b5371d85a0e7db9';
        UPDATE public.transaction SET placement = 115 WHERE height = 0 AND id = 'af39c7406388b706b49f3d416792d2561f3a2af2539fd98e0f2e0f523434e6a8';
        UPDATE public.transaction SET placement = 116 WHERE height = 0 AND id = '00627b98996ae71b9fffe57dc337292ce841b4cdb61f063a55d11363880bfdd2';
        UPDATE public.transaction SET placement = 117 WHERE height = 0 AND id = '538b3c9422e3db0a93e61a8a7178bb99a415807287bfc63414b7238c1aca2f82';
        UPDATE public.transaction SET placement = 118 WHERE height = 0 AND id = '43bd5e41cd7e28b9eda2f2fe16365a69ae822a8c609cdc79fa62d8ab5a2af833';
        UPDATE public.transaction SET placement = 119 WHERE height = 0 AND id = 'd622e55db3fb71637b80317af277485661250898d97a7b7cb51d1e86a680c37f';
        UPDATE public.transaction SET placement = 120 WHERE height = 0 AND id = 'd00c106b03077460e243c6f4f5c9d0a7a1d7a84e4d4896138c67db0645437456';
        UPDATE public.transaction SET placement = 121 WHERE height = 0 AND id = '9020b1b60bdfa26568c84a03a40a3c1603de15ae06dc6d7e75c703e883d68391';
        UPDATE public.transaction SET placement = 122 WHERE height = 0 AND id = '62622c595b2a5c4b5309a081862a5a5ca9d3610dd7c652303091aeb6403d0906';
        UPDATE public.transaction SET placement = 123 WHERE height = 0 AND id = 'c9d6ff0d123ffae5e076bfcc179af0a33a82d73f378459b683874a2fd8201455';
        UPDATE public.transaction SET placement = 124 WHERE height = 0 AND id = '75e7eab665aa0717d3770943f2c6691b58d7f36f166df75314a0dd59b30c4dca';
        UPDATE public.transaction SET placement = 125 WHERE height = 0 AND id = '90ffa004f8f38e6b294538badf65ee152ffc6353b0ae1be77b7054f73cd4f5f5';
        UPDATE public.transaction SET placement = 126 WHERE height = 0 AND id = 'de094b87ef79b0b9af8ca2eba2cef7a4a43c6d228868ba530f0bc37adfb437d2';
        UPDATE public.transaction SET placement = 127 WHERE height = 0 AND id = '6b92fa10accb9e621aa97ea5f02fc39ba234df95fb94f909236e7c552d0ff206';
        UPDATE public.transaction SET placement = 128 WHERE height = 0 AND id = '10d24664542fffb4979636dbe3df387f9a72d87d9a689372cbccef306bbfbe92';
        UPDATE public.transaction SET placement = 129 WHERE height = 0 AND id = '37d5d94c1fc4f3b75e343a929fc7e5ad8eb7cdc890018388d9d0a3d98dcf012c';
        UPDATE public.transaction SET placement = 130 WHERE height = 0 AND id = 'c0cc30740531af3f213492211fd391a3dc04718daec3aaaefc81453c5b5ebf40';
        UPDATE public.transaction SET placement = 131 WHERE height = 0 AND id = '84c14af6abf1aca255c000763998ff11983d5f8ebee0455391fc8001c7426ae9';
        UPDATE public.transaction SET placement = 132 WHERE height = 0 AND id = '73262c9ef9239a25dd6645e52f1566ea1f4f53c11b125d37f39faa3754c98ce0';
        UPDATE public.transaction SET placement = 133 WHERE height = 0 AND id = 'f072dc22997063ddfab10a1acd5f7bb203da817409d9ad5fef3d0c8a6477e9e6';
        UPDATE public.transaction SET placement = 134 WHERE height = 0 AND id = '417d6e471b26bfd80a1438b34b333a5851cd17aa25e8e0ba1c99a5fdcc6a4c26';
        UPDATE public.transaction SET placement = 135 WHERE height = 0 AND id = '16596c56b7c6d4e5a1da44aa62b2c58af170d5bdb81d63f925c717d3bba42931';
        UPDATE public.transaction SET placement = 136 WHERE height = 0 AND id = '8020fddb10e7487c7dda6059b1dff8ab5fd618914c82747eddf5167a3c9a39df';
        UPDATE public.transaction SET placement = 137 WHERE height = 0 AND id = '8b72fb9306ed3606774fbee416b9fc5dfe7d781e7835a109e7dc3e61740863dd';
        UPDATE public.transaction SET placement = 138 WHERE height = 0 AND id = '1091d9fab9ce9b6f622a43db357661e6e412d56af60460d445e43db1413e17ee';
        UPDATE public.transaction SET placement = 139 WHERE height = 0 AND id = 'bae948147e2ba09d4df9ddbbd53d1854de9dfd1d58709b0f78e2a53a4063dade';
        UPDATE public.transaction SET placement = 140 WHERE height = 0 AND id = '2c018d84ee60fa5d335374fcc7cee06e60ac1c14b8ffb6c25918ea664b5c2980';
        UPDATE public.transaction SET placement = 141 WHERE height = 0 AND id = '224abea6263a81bb2faeb074ea2b252970b2dfa6aa32e70896596529ebaecf61';
        UPDATE public.transaction SET placement = 142 WHERE height = 0 AND id = '079dc698da942bcb0c23ecb0c9bae75412fa82fc5f4e2b8175acd7d3d3185c5a';
        UPDATE public.transaction SET placement = 143 WHERE height = 0 AND id = '737cf55f7df4b540e124cb39311a0629a60e7af797334a6b01054978b359af40';
        UPDATE public.transaction SET placement = 144 WHERE height = 0 AND id = 'd1b045e88f1828c3adb0938221e9c247db941c6a64c8eda2259f06ca558b4c98';
        UPDATE public.transaction SET placement = 145 WHERE height = 0 AND id = '08e59b3fe28c705262a5e8ed33387e14fbc38a161e1eb8ba4ef834015abbbe85';
        UPDATE public.transaction SET placement = 146 WHERE height = 0 AND id = '699f36c14fdf86f31a33c6327fc83ed73479c73f14098982ca624fcf6ee72ef5';
        UPDATE public.transaction SET placement = 147 WHERE height = 0 AND id = 'ec8570f001c7e26719ea471d7e6e09f1f8b4636c03c0dae5c66942f138833ad7';
        UPDATE public.transaction SET placement = 148 WHERE height = 0 AND id = 'bb3009a588dd8dde3ccc3579be8fe5538930a029668d5b6a62278db1b8971d7a';
        UPDATE public.transaction SET placement = 149 WHERE height = 0 AND id = '9c88eb86ba3b4631bd177fb92bceea6c370d5214888f02499cb356d07d39b1aa';
        UPDATE public.transaction SET placement = 150 WHERE height = 0 AND id = 'be12c8331fcb6b0ca67d5a5b1a13d1f9d6389f385a2fb87c922bda00b2302bf3';
        UPDATE public.transaction SET placement = 151 WHERE height = 0 AND id = 'd9f9bf0bb1a546adcfbd4f4aa200280617f11f647a194fbef951d0d8a679e6bc';
        UPDATE public.transaction SET placement = 152 WHERE height = 0 AND id = '892e4c8a0019afea4892fb8948dc1f719c6d95a8d1491852b0fdf0d91addc486';
        UPDATE public.transaction SET placement = 153 WHERE height = 0 AND id = '773a9cf06e62945d380ab464f021094f69bde5e1ca8c60229344856de1bd41c2';
        UPDATE public.transaction SET placement = 154 WHERE height = 0 AND id = 'de55991c6119883bcfec677b8d3e1891a3f4d0963b37730c7eb916548a7e2e4c';
        UPDATE public.transaction SET placement = 155 WHERE height = 0 AND id = 'e9294e052a0fde081872969686c133512e44e2a84471aab76e38c75a9972047d';
        UPDATE public.transaction SET placement = 156 WHERE height = 0 AND id = '1b630f334961f4f1eddf0b285d9dc52a169016cdb080f81f8da1b65377957f16';
        UPDATE public.transaction SET placement = 157 WHERE height = 0 AND id = 'bc10561d5b57d9e036a5946a021e3d98e5853edaee027b39b19dd2a77d1f9b79';
        UPDATE public.transaction SET placement = 158 WHERE height = 0 AND id = '07bd803ce065bff5280eea500d58182d4b0c97406476330fb17ef9e6d134e5d6';
        UPDATE public.transaction SET placement = 159 WHERE height = 0 AND id = 'd38306b201d3c48e92ba083b201f8482aaaf9766a8b1cd1ffd201f0424dcdbbe';
        UPDATE public.transaction SET placement = 160 WHERE height = 0 AND id = 'e99cb8521a9c970fabfaecd1a7af36895ddb8974442c78230ea81b944b65086c';
        UPDATE public.transaction SET placement = 161 WHERE height = 0 AND id = '88c7009cb32d514628310d064f34adf0fe1441f4e3d979718485b15f93ad48aa';
        UPDATE public.transaction SET placement = 162 WHERE height = 0 AND id = '3808f4ad91027b307987aa9a125357c2768a22742ae9955684ac5e8d336faea0';
        UPDATE public.transaction SET placement = 163 WHERE height = 0 AND id = 'a8c7231a0844e486148c4abb3b499746c04d29ad08b6330adba956f8033f91b3';
        UPDATE public.transaction SET placement = 164 WHERE height = 0 AND id = 'cf751028d3b3a47be8e5fff91f715c4784c6aa77c67a84fc08c2976a75afae16';
        UPDATE public.transaction SET placement = 165 WHERE height = 0 AND id = '4307bcbc57680810c6b34edbbbdbbea551912531e7f76eac5ffe1843a12c1ef6';
        UPDATE public.transaction SET placement = 166 WHERE height = 0 AND id = '03c2802fb6f9cd52781b7080bf57155d570bbbd9d153095a237cd1b43bef0260';
        UPDATE public.transaction SET placement = 167 WHERE height = 0 AND id = '2536ec67acd2881f1d995882f719aa703f8d6e1ad327145a6b978aeece69a029';
        UPDATE public.transaction SET placement = 168 WHERE height = 0 AND id = '2d8f4335e4b0002127856c69fd336ec35c65a2dd8e0a701cd28fe19e893d2194';
        UPDATE public.transaction SET placement = 169 WHERE height = 0 AND id = '6c09297ea53f9932f0c62610dacc574cd537ef80de462884839f2ab51a917a1c';
        UPDATE public.transaction SET placement = 170 WHERE height = 0 AND id = '5cbfdf26328d2902dfc0bc91970835009d2b4dbbf62141cedc777633d7bc536a';
        UPDATE public.transaction SET placement = 171 WHERE height = 0 AND id = 'c761f8f134254665fc104e04e2b100cbd50014f7ec8773d05cd5ae50c9369547';
        UPDATE public.transaction SET placement = 172 WHERE height = 0 AND id = '30bf59f7a620bc5ea7dfcb4e3e1653b2e1c36dd9bfee6a0196761ec259a6b6e2';
        UPDATE public.transaction SET placement = 173 WHERE height = 0 AND id = '186a49f4919ef3f7461a41776a1e1c67c055b7db37c59a772279c846452c11e0';
        UPDATE public.transaction SET placement = 174 WHERE height = 0 AND id = '12e8b0520d2e67f14261ec373173062ea3eb0800a91bcdc497ba3287be1bbe39';
        UPDATE public.transaction SET placement = 175 WHERE height = 0 AND id = '79fdd368bfe57cbb77b9c283e41fd420e0f63960b020e4153db0188311bca78c';
        UPDATE public.transaction SET placement = 176 WHERE height = 0 AND id = '441baf55a8c2b14fb57ec289c9ebf6c4c9c47324f329fccdfaf3c413fa59c614';
        UPDATE public.transaction SET placement = 177 WHERE height = 0 AND id = '4c345bef5a8af190bafe8dc3a9cc49e740a34049c8baa137ebe5bd7028368ac0';
        UPDATE public.transaction SET placement = 178 WHERE height = 0 AND id = '7a0d805f3ca5cd6c46f6bde164fe85351da10311045b610fb849553c67eb0d38';
        UPDATE public.transaction SET placement = 179 WHERE height = 0 AND id = '531cc9d8aab9f80241f9f3d926083f4d52cf3e85738d40d0df8895451c6d6137';
        UPDATE public.transaction SET placement = 180 WHERE height = 0 AND id = '3d57d76faae4e1f7e9417ba6db1442682541fe3366674c960b69e9f783d5c291';
        UPDATE public.transaction SET placement = 181 WHERE height = 0 AND id = '3c8a040d995914417188072e224884a58ce79378efa962b915f774703d640f41';
        UPDATE public.transaction SET placement = 182 WHERE height = 0 AND id = '18faeaad82902a7f9f49194eeea52e2881d4429204390ac0c84a244309f260db';
        UPDATE public.transaction SET placement = 183 WHERE height = 0 AND id = '7e7faf56ef7d67f4690eb464005d76239ba01ae66a953a4ed2948ca98e515fed';
        UPDATE public.transaction SET placement = 184 WHERE height = 0 AND id = '703c350c4c1322f810099d8504581ead4203e666385eab6d2a93a9133d755df9';
        UPDATE public.transaction SET placement = 185 WHERE height = 0 AND id = 'f278ac80fe1ba5d6699b121c2937bd7be4714129ae1c5521dff2497b874970d1';
        UPDATE public.transaction SET placement = 186 WHERE height = 0 AND id = 'e12310bb8b7953a6ce47a30591bf759731b428f7d3ad15d002f54636e5c868b1';
        UPDATE public.transaction SET placement = 187 WHERE height = 0 AND id = 'f3bc23a826b6a5a7b2c457bb7b72915961b939c78c1ede11842cbb4460277a3f';
        UPDATE public.transaction SET placement = 188 WHERE height = 0 AND id = '0b924c11aaf8f92517dfa0c2b6e8dd032be53bfb3cb486f4903a8febf2f2903d';
        UPDATE public.transaction SET placement = 189 WHERE height = 0 AND id = '60295c29adc9b85703cd502d40f7bc96522939bffb5c12940488ef0eeb0b1816';
        UPDATE public.transaction SET placement = 190 WHERE height = 0 AND id = '9dd9dcb1a1abc1e38e1fde583348db891f0948b22ecd329b9e7dfde71077f907';
        UPDATE public.transaction SET placement = 191 WHERE height = 0 AND id = '398c2caca860a6d59e88632d3ce916b654f17ffb468960708c92273a22395186';
        UPDATE public.transaction SET placement = 192 WHERE height = 0 AND id = 'c5e630220b8eb8c1cd6ae0463556f477fd38b15546a1646561e07ef193d82118';
        UPDATE public.transaction SET placement = 193 WHERE height = 0 AND id = 'f8225885511b6f51074490c162fa3d7ef7621f33924de81e39d6920a2e242327';
        UPDATE public.transaction SET placement = 194 WHERE height = 0 AND id = 'e338b53a6c08f37e5616595a8c5155b0d329f4376aef4e028bda2b3c970e9e54';
        UPDATE public.transaction SET placement = 195 WHERE height = 0 AND id = '91ed4a4c3d13c4394bb9624c7b4a47956e1306f1ec8f22e5feb26ab44b904be9';
        UPDATE public.transaction SET placement = 196 WHERE height = 0 AND id = 'd94386c3f0ec637b2c369ae985d0ce1ebeb8d6f10aa9422239b195d4da8bfc5c';
        UPDATE public.transaction SET placement = 197 WHERE height = 0 AND id = '8bf9d359befe1bae9f6b83a58a972e21a2605396e08465074f1b0a5d5f224b7c';
        UPDATE public.transaction SET placement = 198 WHERE height = 0 AND id = '66c68f3581cd926e8a544f59184162dcc8d620d99cd9a4ff7701f3b3532664f9';
        UPDATE public.transaction SET placement = 199 WHERE height = 0 AND id = '9db01c5e802e0c72f89e97749fd48c3e8bac50bb1c8070e228d6cbf35b43038e';
        UPDATE public.transaction SET placement = 200 WHERE height = 0 AND id = '3d4b5471cedf9a4d68b98b7d7081fa638df2921a799e5856c86eccc538263147';
        UPDATE public.transaction SET placement = 201 WHERE height = 0 AND id = '502743799ba84ffae0470b96d4bec7e2fccb7cddbf33c0ffd4a706905d29a791';
        UPDATE public.transaction SET placement = 202 WHERE height = 0 AND id = 'ccdb8ee04e8d2ed8e9668cc2fd35ca62d432cc9b3506dfa029f75f5c12370aa5';
    `);

    // drop default value on "placement" column
    await queryRunner.query(`
      ALTER TABLE public.transaction ALTER COLUMN placement DROP DEFAULT;
    `);

    // add unique constraint for two columns
    await queryRunner.query(`
      ALTER TABLE ONLY public.transaction
        ADD CONSTRAINT "transaction_height_placement_key" UNIQUE (height, placement);
    `);
  }
  async down(queryRunner: QueryRunner): Promise<any> {}
}
