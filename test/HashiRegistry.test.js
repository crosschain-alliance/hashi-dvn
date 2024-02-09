const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("HashiRegistry test", function () {
  let hashiRegistry;
  const srcEid = 77;
  const dstEid = 88;
  const sourceAdapters_ = [
    "0x0000000000000000000000000000000000000011",
    "0x0000000000000000000000000000000000000022",
  ];
  const destAdapters_ = [
    "0x0000000000000000000000000000000000000033",
    "0x0000000000000000000000000000000000000044",
  ];

  beforeEach(async function () {
    const HashiRegistryFactory =
      await ethers.getContractFactory("HashiRegistry");
    hashiRegistry = await HashiRegistryFactory.deploy();
  });

  it("Should set destination fee correctly", async function () {
    await hashiRegistry.setDestFee(dstEid, 100);
    let fee = await hashiRegistry.getDestFee(dstEid);
    expect(fee).to.equal(100n);
  });

  it("Should set source adapters pair correctly", async function () {
    await expect(
      await hashiRegistry.setSourceAdaptersPair(
        srcEid,
        dstEid,
        sourceAdapters_,
        destAdapters_,
      ),
    )
      .to.emit(hashiRegistry, "NewSourceAdaptersPairSet")
      .withArgs(srcEid, dstEid, anyValue, anyValue);
  });

  it("Should get source adapters pair correctly", async function () {
    await hashiRegistry.setSourceAdaptersPair(
      srcEid,
      dstEid,
      sourceAdapters_,
      destAdapters_,
    );
    let adaptersPair = await hashiRegistry.getSourceAdaptersPair(
      srcEid,
      dstEid,
    );

    expect(adaptersPair[0][0]).to.equal(sourceAdapters_[0]);
    expect(adaptersPair[0][1]).to.equal(destAdapters_[0]);
    expect(adaptersPair[1][0]).to.equal(sourceAdapters_[1]);
    expect(adaptersPair[1][1]).to.equal(destAdapters_[1]);
  });

  it("Should set destination adapters correctly", async function () {
    await hashiRegistry.setDestAdapters(srcEid, dstEid, destAdapters_);
    await expect(
      await hashiRegistry.setDestAdapters(srcEid, dstEid, destAdapters_),
    )
      .to.emit(hashiRegistry, "NewDestAdaptersPairSet")
      .withArgs(srcEid, dstEid, anyValue);
  });

  it("Should get destination adapters correctly", async function () {
    await hashiRegistry.setDestAdapters(srcEid, dstEid, destAdapters_);
    let destAdapters = await hashiRegistry.getDestAdapters(srcEid, dstEid);

    expect(destAdapters[0]).to.equal(destAdapters_[0]);
    expect(destAdapters[1]).to.equal(destAdapters_[1]);
  });
});
