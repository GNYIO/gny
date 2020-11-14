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
      ADD CONSTRAINT "PK_119b2d1c1bdccc42057c303c44f" PRIMARY KEY (name);


      --
      -- Name: transfer PK_2096c4a2cd297c8b674c33fbb79; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.transfer
          ADD CONSTRAINT "PK_2096c4a2cd297c8b674c33fbb79" PRIMARY KEY (tid);


      --
      -- Name: variable PK_450189260452bd3778ccb1ec4f3; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.variable
          ADD CONSTRAINT "PK_450189260452bd3778ccb1ec4f3" PRIMARY KEY (key);


      --
      -- Name: issuer PK_4caba2816d56fda80881f295858; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.issuer
          ADD CONSTRAINT "PK_4caba2816d56fda80881f295858" PRIMARY KEY (name);


      --
      -- Name: prediction PK_4fafe08911cf825f453a3241037; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.prediction
          ADD CONSTRAINT "PK_4fafe08911cf825f453a3241037" PRIMARY KEY (address);


      --
      -- Name: round PK_635f502d0ad0363d8e824e5e5ea; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.round
          ADD CONSTRAINT "PK_635f502d0ad0363d8e824e5e5ea" PRIMARY KEY (round);


      --
      -- Name: info PK_78a6f2f509106f740de892e87f0; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.info
          ADD CONSTRAINT "PK_78a6f2f509106f740de892e87f0" PRIMARY KEY (key);


      --
      -- Name: block_history PK_7cc0c3368bffdbd512ad86d161a; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.block_history
          ADD CONSTRAINT "PK_7cc0c3368bffdbd512ad86d161a" PRIMARY KEY (height);


      --
      -- Name: account PK_83603c168bc00b20544539fbea6; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.account
          ADD CONSTRAINT "PK_83603c168bc00b20544539fbea6" PRIMARY KEY (address);


      --
      -- Name: mldata PK_8586d0c3cbd6c39fe56a7dde57c; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.mldata
          ADD CONSTRAINT "PK_8586d0c3cbd6c39fe56a7dde57c" PRIMARY KEY (address, id, "ProductName");


      --
      -- Name: transaction PK_89eadb93a89810556e1cbcd6ab9; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.transaction
          ADD CONSTRAINT "PK_89eadb93a89810556e1cbcd6ab9" PRIMARY KEY (id);


      --
      -- Name: balance PK_9445c540e97ae6e4265df7450fe; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.balance
          ADD CONSTRAINT "PK_9445c540e97ae6e4265df7450fe" PRIMARY KEY (address, currency);


      --
      -- Name: block PK_d0925763efb591c2e2ffb267572; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.block
          ADD CONSTRAINT "PK_d0925763efb591c2e2ffb267572" PRIMARY KEY (id);


      --
      -- Name: delegate PK_eaafa33d48c79db2cb9d1ae55b0; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.delegate
          ADD CONSTRAINT "PK_eaafa33d48c79db2cb9d1ae55b0" PRIMARY KEY (address);


      --
      -- Name: vote PK_f91dc59d294ca64ad129516aa7d; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.vote
          ADD CONSTRAINT "PK_f91dc59d294ca64ad129516aa7d" PRIMARY KEY ("voterAddress", delegate);


      --
      -- Name: delegate UQ_15835fdff2104205606fb86022e; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.delegate
          ADD CONSTRAINT "UQ_15835fdff2104205606fb86022e" UNIQUE ("publicKey");


      --
      -- Name: issuer UQ_17fd1469f8b76147413f5c3f8dd; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.issuer
          ADD CONSTRAINT "UQ_17fd1469f8b76147413f5c3f8dd" UNIQUE (tid);


      --
      -- Name: asset UQ_28ddf8add4e74248f36ece7df52; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.asset
          ADD CONSTRAINT "UQ_28ddf8add4e74248f36ece7df52" UNIQUE (tid);


      --
      -- Name: account UQ_41dfcb70af895ddf9a53094515b; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.account
          ADD CONSTRAINT "UQ_41dfcb70af895ddf9a53094515b" UNIQUE (username);


      --
      -- Name: delegate UQ_944657166892e70121acc2affab; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.delegate
          ADD CONSTRAINT "UQ_944657166892e70121acc2affab" UNIQUE (tid);


      --
      -- Name: delegate UQ_b5114b7a2bc8f0d2a99c4600619; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.delegate
          ADD CONSTRAINT "UQ_b5114b7a2bc8f0d2a99c4600619" UNIQUE (username);


      --
      -- Name: block UQ_bce676e2b005104ccb768495dbb; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.block
          ADD CONSTRAINT "UQ_bce676e2b005104ccb768495dbb" UNIQUE (height);


      --
      -- Name: issuer UQ_e0ab1d603d280cd6e4e827449ae; Type: CONSTRAINT; Schema: public; Owner: postgres
      --

      ALTER TABLE ONLY public.issuer
          ADD CONSTRAINT "UQ_e0ab1d603d280cd6e4e827449ae" UNIQUE ("issuerId");


      --
      -- Name: IDX_2534ff92482137297bbb904516; Type: INDEX; Schema: public; Owner: postgres
      --

      CREATE INDEX "IDX_2534ff92482137297bbb904516" ON public.transfer USING btree (height);


      --
      -- Name: IDX_2dffa75d0687591f62ad59b6d0; Type: INDEX; Schema: public; Owner: postgres
      --

      CREATE INDEX "IDX_2dffa75d0687591f62ad59b6d0" ON public.prediction USING btree (prediction);


      --
      -- Name: IDX_4fafe08911cf825f453a324103; Type: INDEX; Schema: public; Owner: postgres
      --

      CREATE INDEX "IDX_4fafe08911cf825f453a324103" ON public.prediction USING btree (address);


      --
      -- Name: IDX_5c67cbcf4960c1a39e5fe25e87; Type: INDEX; Schema: public; Owner: postgres
      --

      CREATE INDEX "IDX_5c67cbcf4960c1a39e5fe25e87" ON public.block USING btree ("timestamp");


      --
      -- Name: IDX_6a18c33aeed8b1bff59a112854; Type: INDEX; Schema: public; Owner: postgres
      --

      CREATE INDEX "IDX_6a18c33aeed8b1bff59a112854" ON public.balance USING btree (address);


      --
      -- Name: IDX_6d9eb09fb37a1311682d1becab; Type: INDEX; Schema: public; Owner: postgres
      --

      CREATE INDEX "IDX_6d9eb09fb37a1311682d1becab" ON public.transfer USING btree ("recipientId");


      --
      -- Name: IDX_70ff8b624c3118ac3a4862d22c; Type: INDEX; Schema: public; Owner: postgres
      --

      CREATE INDEX "IDX_70ff8b624c3118ac3a4862d22c" ON public.transfer USING btree ("timestamp");


      --
      -- Name: IDX_780bd0b359a2b4576b2e326860; Type: INDEX; Schema: public; Owner: postgres
      --

      CREATE INDEX "IDX_780bd0b359a2b4576b2e326860" ON public.transfer USING btree ("senderId");


      --
      -- Name: IDX_87f2932d4a558d44a2915f849a; Type: INDEX; Schema: public; Owner: postgres
      --

      CREATE INDEX "IDX_87f2932d4a558d44a2915f849a" ON public.transaction USING btree ("timestamp");


      --
      -- Name: IDX_a2149e84ca1fc59b73f2ed05fa; Type: INDEX; Schema: public; Owner: postgres
      --

      CREATE INDEX "IDX_a2149e84ca1fc59b73f2ed05fa" ON public.transfer USING btree (currency);


      --
      -- Name: IDX_b08d89b57c60050b62d774665f; Type: INDEX; Schema: public; Owner: postgres
      --

      CREATE INDEX "IDX_b08d89b57c60050b62d774665f" ON public.asset USING btree ("timestamp");


      --
      -- Name: IDX_b3d761ec0d43155eedb1b8e805; Type: INDEX; Schema: public; Owner: postgres
      --

      CREATE INDEX "IDX_b3d761ec0d43155eedb1b8e805" ON public.asset USING btree (maximum);


      --
      -- Name: IDX_bc03a07ccceb7ab56033b28f6c; Type: INDEX; Schema: public; Owner: postgres
      --

      CREATE INDEX "IDX_bc03a07ccceb7ab56033b28f6c" ON public.balance USING btree (currency);


      --
      -- Name: IDX_bf095b76c619d78b5bde675240; Type: INDEX; Schema: public; Owner: postgres
      --

      CREATE INDEX "IDX_bf095b76c619d78b5bde675240" ON public.balance USING btree (flag);


      --
      -- Name: IDX_cce9f3db01ff7df5db4d337869; Type: INDEX; Schema: public; Owner: postgres
      --

      CREATE INDEX "IDX_cce9f3db01ff7df5db4d337869" ON public.transaction USING btree (type);


      --
      -- Name: IDX_ceb536cf0a612deadf41335ef2; Type: INDEX; Schema: public; Owner: postgres
      --

      CREATE INDEX "IDX_ceb536cf0a612deadf41335ef2" ON public.delegate USING btree (votes);


      --
      -- Name: IDX_e157c4f9e492b9ea968e3de2e3; Type: INDEX; Schema: public; Owner: postgres
      --

      CREATE INDEX "IDX_e157c4f9e492b9ea968e3de2e3" ON public.block USING btree ("prevBlockId");


      --
      -- Name: IDX_eaa8cb83847165386f05e940a3; Type: INDEX; Schema: public; Owner: postgres
      --

      CREATE INDEX "IDX_eaa8cb83847165386f05e940a3" ON public.transaction USING btree (message);


      --
      -- Name: IDX_ed3e32981d7a640be5480effec; Type: INDEX; Schema: public; Owner: postgres
      --

      CREATE INDEX "IDX_ed3e32981d7a640be5480effec" ON public.transaction USING btree ("senderId");
    `);
  }
  async down(queryRunner: QueryRunner): Promise<any> {}
}
